export type Coordinate = [number, number]
export type Ring = Coordinate[]
export type Polygon = Ring[]

export interface Country {
  id: string
  name: string
  continent: string
  center: Coordinate
  small: boolean
  playable: boolean
  polygons: Polygon[]
}

export const CONTINENTS = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania'] as const

export function unwrapRing(ring: Ring): Ring {
  const result: Ring = []
  for (const [lon, lat] of ring) {
    const previous = result.at(-1)?.[0] ?? lon
    result.push([lon + 360 * Math.round((previous - lon) / 360), lat])
  }
  return result
}

function inRing([lon, lat]: Coordinate, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!
    const [xj, yj] = ring[j]!
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) {inside = !inside}
  }
  return inside
}

// Prepare once. The broad bounds check avoids scanning every coastline on a tap.
export function createCountryPicker(countries: Country[]) {
  const parts = countries.filter(country => country.playable).flatMap(country => country.polygons.map(polygon => {
    const rings = polygon.map(unwrapRing)
    const outer = rings[0]!
    return {
      country, rings,
      west: Math.min(...outer.map(p => p[0])), east: Math.max(...outer.map(p => p[0])),
      south: Math.min(...outer.map(p => p[1])), north: Math.max(...outer.map(p => p[1])),
    }
  })).sort((a, b) => (a.east - a.west) * (a.north - a.south) - (b.east - b.west) * (b.north - b.south))
  return ([longitude, latitude]: Coordinate): Country | undefined => {
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || Math.abs(latitude) > 90) {return}
    const lon = ((longitude + 180) % 360 + 360) % 360 - 180
    for (const part of parts) {
      if (latitude < part.south || latitude > part.north) {continue}
      const x = lon + 360 * Math.round(((part.west + part.east) / 2 - lon) / 360)
      if (x < part.west || x > part.east || !inRing([x, latitude], part.rings[0]!)) {continue}
      if (part.rings.slice(1).some(ring => inRing([x, latitude], ring))) {continue}
      return part.country
    }
  }
}

export function coordinateToVector([lon, lat]: Coordinate): [number, number, number] {
  const phi = lat * Math.PI / 180
  const theta = lon * Math.PI / 180
  return [Math.cos(phi) * Math.cos(theta), Math.sin(phi), -Math.cos(phi) * Math.sin(theta)]
}

export function vectorToCoordinate({ x, y, z }: { x: number; y: number; z: number }): Coordinate {
  const length = Math.hypot(x, y, z)
  return [Math.atan2(-z, x) * 180 / Math.PI, Math.asin(Math.max(-1, Math.min(1, y / length))) * 180 / Math.PI]
}

export function validateCountries(value: unknown): Country[] {
  if (!Array.isArray(value) || value.length !== 195) {throw new Error('The country data is incomplete.')}
  const ids = new Set<string>()
  for (const c of value as Country[]) {
    if (!c || typeof c.id !== 'string' || ids.has(c.id) || typeof c.name !== 'string' || typeof c.continent !== 'string'
      || c.playable !== true || typeof c.small !== 'boolean' || !Array.isArray(c.center) || c.center.length !== 2
      || !c.center.every(Number.isFinite) || Math.abs(c.center[0]) > 180 || Math.abs(c.center[1]) > 90 || !Array.isArray(c.polygons)
      || !c.polygons.every(p => Array.isArray(p) && p.length > 0 && p.every(r => Array.isArray(r) && r.length >= 4 && r.every(v => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && Math.abs(v[0]) <= 180 && Math.abs(v[1]) <= 90)))) {
      throw new Error('The country data could not be read.')
    }
    ids.add(c.id)
  }
  if (value.filter(c => c.playable).length !== 195) {throw new Error('The quiz country list is incomplete.')}
  return value
}

export async function fetchCountries(base: string, signal: AbortSignal): Promise<Country[]> {
  if (import.meta.env?.VITE_NATIVE !== 'true' && typeof DecompressionStream !== 'undefined') {
    const compressed = await fetch(`${base}data/globe/countries.json.gz`, { signal })
    if (compressed.ok && compressed.body) {
      const response = compressed.headers.get('content-encoding') === 'gzip' ? compressed : new Response(compressed.body.pipeThrough(new DecompressionStream('gzip')))
      return validateCountries(await response.json())
    }
  }
  const response = await fetch(`${base}data/globe/countries.json`, { signal })
  if (!response.ok) {throw new Error(`Country data could not be loaded, HTTP ${response.status}.`)}
  return validateCountries(await response.json())
}
