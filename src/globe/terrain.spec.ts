import { expect, it, vi } from 'vitest'
import * as THREE from 'three'
import { readFileSync } from 'node:fs'
import { countrySurface, GlobeImagery } from './terrain'
import { countryAngularSize, islandBlend } from './detail'
import { coordinateToVector, validateCountries } from './geography'

const countries = validateCountries(JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')))
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
