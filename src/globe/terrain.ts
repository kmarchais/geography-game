import * as THREE from 'three'
import { coordinateToVector, unwrapRing, type Country } from './geography'
import { imageryTiles, imageryUrl, type ImageryTile } from './detail'

export function countryOutlines(countries: Country[]): THREE.BufferGeometry {
  const points: number[] = []
  for (const country of countries) {for (const polygon of country.polygons) {for (const source of polygon) {
    const ring = unwrapRing(source)
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1]!, b = ring[i]!
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) / .5))
      for (let step = 0; step < steps; step++) {for (const t of [step / steps, (step + 1) / steps]) {
        points.push(...coordinateToVector([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]).map(v => v * 1.0003))
      }}
    }
  }}}
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
}

export function countrySurface(country: Country): THREE.BufferGeometry {
  const points: number[] = []
  for (const polygon of country.polygons) {
    const rings = polygon.map(ring => unwrapRing(ring).map(([x, y]) => new THREE.Vector2(x, y)))
    const triangles = THREE.ShapeUtils.triangulateShape(rings[0]!, rings.slice(1))
    const vertices = rings.flat()
    for (const triangle of triangles) {for (const index of triangle) {
      const p = vertices[index]!
      points.push(...coordinateToVector([p.x, p.y]).map(v => v * 1.0003))
    }}
  }
  return new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
}

/** Bounded, on-demand NASA imagery. The local Earth remains the offline fallback. */
export class GlobeImagery extends THREE.Group {
  private tiles = new Map<string, THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>>()
  private wanted = new Map<string, ImageryTile>()
  private pending = new Map<string, AbortController>()
  private failed = new Map<string, number>()
  private retryTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  private online = () => { this.failed.clear(); this.pump() }

  constructor(private invalidate: () => void) { super(); window.addEventListener('online', this.online) }

  update(camera: THREE.PerspectiveCamera, height: number): void {
    const position = camera.position
    const lon = Math.atan2(-position.z, position.x) * 180 / Math.PI
    const lat = Math.asin(position.y / position.length()) * 180 / Math.PI
    const desired = imageryTiles([lon, lat], position.length(), camera.aspect, height)
    this.wanted = new Map(desired.map(tile => [tile.key, tile]))
    for (const [key, controller] of this.pending) {if (!this.wanted.has(key)) {controller.abort()}}
    this.visible = desired.length > 0
    for (const [key, mesh] of this.tiles) {mesh.visible = this.wanted.has(key)}
    this.pump()
  }

  private pump(): void {
    if (this.disposed) {return}
    clearTimeout(this.retryTimer)
    for (const [key, tile] of this.wanted) {
      if (this.pending.size >= 4) {break}
      if (this.tiles.has(key) || this.pending.has(key) || (this.failed.get(key) ?? 0) > Date.now()) {continue}
      this.failed.delete(key)
      const controller = new AbortController()
      const deadline = setTimeout(() => controller.abort(), 12000)
      this.pending.set(key, controller)
      fetch(imageryUrl(tile), { signal: controller.signal }).then(response => {
        if (!response.ok) {throw new Error(`Imagery HTTP ${response.status}`)}
        return response.blob()
      }).then(blob => createImageBitmap(blob, { imageOrientation: 'flipY' })).then(bitmap => {
        if (this.disposed || controller.signal.aborted) { bitmap.close(); return }
        this.failed.delete(key)
        const texture = new THREE.Texture(bitmap)
        texture.flipY = false
        texture.needsUpdate = true
        texture.colorSpace = THREE.SRGBColorSpace
        texture.anisotropy = 2
        texture.onUpdate = () => bitmap.close()
        const radians = Math.PI / 180
        const geometry = new THREE.SphereGeometry(1.0002, 24, 24, (tile.west + 180) * radians, tile.span * radians, (90 - tile.north) * radians, tile.latitudeSpan * radians)
        const uv = geometry.getAttribute('uv')
        const ratio = tile.latitudeSpan / tile.span
        for (let i = 0; i < uv.count; i++) {uv.setY(i, uv.getY(i) * ratio + 1 - ratio)}
        const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ map: texture, color: '#d8e3e7', shininess: 12, specular: '#132537', depthWrite: false }))
        mesh.visible = this.wanted.has(key)
        mesh.renderOrder = 1
        this.tiles.set(key, mesh)
        this.add(mesh)
        while (this.tiles.size > 32) {
          const old = [...this.tiles.keys()].find(k => !this.wanted.has(k))
          if (!old) {break}
          this.release(old)
        }
        this.invalidate()
      }).catch(() => {
        if (!this.disposed && this.wanted.has(key)) {this.failed.set(key, Date.now() + 5000)}
        if (this.failed.size > 128) {this.failed.delete(this.failed.keys().next().value!)}
      }).finally(() => { clearTimeout(deadline); this.pending.delete(key); this.pump() })
    }
    const retryAt = this.pending.size >= 4 ? Infinity : Math.min(...[...this.failed].filter(([key]) => this.wanted.has(key) && !this.tiles.has(key) && !this.pending.has(key)).map(([, time]) => time))
    if (Number.isFinite(retryAt)) {this.retryTimer = setTimeout(() => this.pump(), Math.max(100, retryAt - Date.now()))}
  }

  private release(key: string): void {
    const mesh = this.tiles.get(key)!
    this.remove(mesh)
    mesh.geometry.dispose()
    const bitmap = mesh.material.map?.image
    if (bitmap instanceof ImageBitmap) {bitmap.close()}
    mesh.material.map?.dispose()
    mesh.material.dispose()
    this.tiles.delete(key)
  }

  override dispose(): void {
    this.disposed = true
    clearTimeout(this.retryTimer)
    window.removeEventListener('online', this.online)
    for (const controller of this.pending.values()) {controller.abort()}
    for (const key of this.tiles.keys()) {this.release(key)}
    super.dispose()
  }
}
