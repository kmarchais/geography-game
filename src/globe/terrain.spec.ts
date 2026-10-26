import { expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { countryOutlines, countrySurface, outlineBatches, outlineHorizon, GlobeImagery } from './terrain'
import { countryAngularSize, islandBlend } from './detail'
import { coordinateToVector, validateCountries } from './geography'

const countries = validateCountries(JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')))
it('spatial border batches preserve every original segment exactly', () => {
  const outlines = countryOutlines(countries), batches = outlineBatches(outlines)
  const segments = (geometry: THREE.BufferGeometry) => {
    const positions = geometry.getAttribute('position'), result: string[] = []
    for (let i = 0; i < positions.count; i += 2) {result.push(Array.from({ length: 6 }, (_, n) => positions.getComponent(i + Math.floor(n / 3), n % 3)).join(','))}
    return result
  }
  expect(batches.flatMap(segments).sort()).toEqual(segments(outlines).sort())
  expect(batches.every(batch => batch.boundingSphere!.radius < .3)).toBe(true)
  const camera = new THREE.PerspectiveCamera(42, 1054 / 925, .0001, 100)
  camera.position.fromArray(coordinateToVector([1.57, 42.54])).multiplyScalar(1.0025)
  camera.lookAt(0, 0, 0); camera.updateMatrixWorld()
  const frustum = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse))
  const visible = batches.filter(batch => batch.boundingSphere!.center.dot(camera.position) + batch.boundingSphere!.radius * camera.position.length() > outlineHorizon(camera.position.length()) && frustum.intersectsSphere(batch.boundingSphere!))
  expect(visible.length).toBeGreaterThan(0)
  expect(visible.reduce((sum, batch) => sum + batch.getAttribute('position').count, 0)).toBeLessThan(outlines.getAttribute('position').count * .1)
  outlines.dispose(); batches.forEach(batch => batch.dispose())
})

it('keeps raised island borders visible just beyond the ground tangent', () => {
  const camera = new THREE.Vector3(0, 0, 1.4)
  const angle = Math.acos(1 / 1.4) + .5 * Math.PI / 180
  const point = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle)).multiplyScalar(1.0003)
  const ray = new THREE.Ray(camera, point.clone().sub(camera).normalize())
  expect(ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), 1), new THREE.Vector3())).toBeNull()
  expect(point.dot(camera)).toBeLessThan(1)
  expect(point.dot(camera)).toBeGreaterThan(outlineHorizon(camera.length()))
})
it.each(['VAT', 'NRU'])('replaces the %s marker with pickable territory at maximum zoom', id => {
  const country = countries.find(c => c.id === id)!
  const distance = 1.002
  const pixels = countryAngularSize(country) * 300 / (2 * Math.tan(21 * Math.PI / 180)) / (distance - 1)
  expect(islandBlend(pixels, distance)).toBeCloseTo(1)
  const geometry = countrySurface(country)
  const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  const mesh = new THREE.Mesh(geometry, material)
  const normal = new THREE.Vector3(...coordinateToVector(country.center))
  const ray = new THREE.Raycaster(normal.clone().multiplyScalar(distance), normal.clone().negate())
  expect(ray.intersectObject(mesh).length).toBeGreaterThan(0)
  geometry.dispose()
  material.dispose()
})

it('automatically retries failed imagery and leaves no retry timer after success', async () => {
  vi.useFakeTimers()
  class Bitmap { close() {} }
  vi.stubGlobal('ImageBitmap', Bitmap)
  vi.stubGlobal('createImageBitmap', async () => new Bitmap())
  let offline = true
  const request = vi.fn(async () => ({ ok: !offline, status: offline ? 503 : 200, blob: async () => new Blob() }))
  vi.stubGlobal('fetch', request)
  const imagery = new GlobeImagery(() => {})
  try {
    const camera = new THREE.PerspectiveCamera(42, 1.5)
    camera.position.set(1.1, 0, 0)
    imagery.update(camera, 700)
    await vi.advanceTimersByTimeAsync(1)
    expect(vi.getTimerCount()).toBe(1)
    offline = false
    await vi.advanceTimersByTimeAsync(5000)
    expect(imagery.children.length).toBeGreaterThan(0)
    expect(vi.getTimerCount()).toBe(0)
    const count = request.mock.calls.length
    await vi.advanceTimersByTimeAsync(60000)
    expect(request.mock.calls.length).toBe(count)
  } finally { imagery.dispose(); vi.unstubAllGlobals(); vi.useRealTimers() }
})

it('aborts all obsolete requests so the new view can use the loader slots', async () => {
  const signals: AbortSignal[] = []
  vi.stubGlobal('fetch', (_url: string, { signal }: { signal: AbortSignal }) => {
    signals.push(signal)
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true }))
  })
  const imagery = new GlobeImagery(() => {})
  try {
    const camera = new THREE.PerspectiveCamera(42, 1.5)
    camera.position.set(1.1, 0, 0)
    imagery.update(camera, 700)
    expect(signals.length).toBe(4)
    camera.position.set(-1.1, 0, 0)
    imagery.update(camera, 700)
    expect(signals.slice(0, 4).every(signal => signal.aborted)).toBe(true)
    await vi.waitFor(() => expect(signals.length).toBeGreaterThan(4))
  } finally { imagery.dispose(); vi.unstubAllGlobals() }
})

it('times out four stalled current-view requests, recovers, and becomes idle', async () => {
  vi.useFakeTimers()
  class Bitmap { close() {} }
  vi.stubGlobal('ImageBitmap', Bitmap)
  vi.stubGlobal('createImageBitmap', async () => new Bitmap())
  const stalled: AbortSignal[] = []
  const requests: string[] = []
  vi.stubGlobal('fetch', (url: string, { signal }: { signal: AbortSignal }) => {
    requests.push(url)
    if (stalled.length >= 4) {return Promise.resolve({ ok: true, blob: async () => new Blob() })}
    stalled.push(signal)
    return new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Timeout', 'AbortError')), { once: true }))
  })
  const imagery = new GlobeImagery(() => {})
  try {
    const camera = new THREE.PerspectiveCamera(42, 1.5)
    camera.position.set(1.1, 0, 0)
    imagery.update(camera, 700)
    expect(stalled.length).toBe(4)
    const timedOutUrls = requests.slice(0, 4)
    await vi.advanceTimersByTimeAsync(12001)
    expect(stalled.every(signal => signal.aborted)).toBe(true)
    expect(imagery.children.length).toBeGreaterThan(0)
    await vi.advanceTimersByTimeAsync(5001)
    for (const url of timedOutUrls) {expect(requests.filter(request => request === url).length).toBe(2)}
    expect(vi.getTimerCount()).toBe(0)
  } finally { imagery.dispose(); vi.unstubAllGlobals(); vi.useRealTimers() }
})
