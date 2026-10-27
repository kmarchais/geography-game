import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { topology } from 'topojson-server'
import { feature } from 'topojson-client'
import { presimplify, simplify } from 'topojson-simplify'
import { createCountryPicker, validateCountries } from '../src/globe/geography.ts'

// Deliberate geography update only. Normal builds never regenerate this snapshot.
const source = new URL('https://data-gis.unep-wcmc.org/server/rest/services/Hosted/UN_Boundaries/MapServer/6/query')
source.search = new URLSearchParams({ where: '1=1', outFields: 'iso3cd,romnam,isoclr,stscod', returnGeometry: 'true', outSR: '4326', geometryPrecision: '5', f: 'geojson' }).toString()
const outputDirectory = process.argv[3] || 'public/data/globe'
await mkdir(outputDirectory, { recursive: true })
const progress = (fraction, message) => console.log(JSON.stringify({ fraction, message }))
progress(0, 'Read UN combined-country source')
const bytes = process.argv[2] ? await readFile(process.argv[2]) : Buffer.from(await (await fetch(source, { signal: AbortSignal.timeout(120000) })).arrayBuffer())
const raw = JSON.parse(bytes)
if (!Array.isArray(raw.features) || raw.exceededTransferLimit) throw Error('Incomplete UN boundary response')
const catalog = JSON.parse(await readFile(new URL('./data/globe-catalog.json', import.meta.url)))
const countries = catalog.map(c => ({ ...c, center: [...c.center], small: false, playable: true, polygons: [] }))
const byId = new Map(countries.map(c => [c.id, c]))
const background = []
for (const shape of raw.features) {
  const id = shape.properties.isoclr, country = byId.get(id)
  if (!country) {background.push({ id: shape.properties.iso3cd, name: shape.properties.romnam, status: shape.properties.stscod }); continue}
  const polygons = shape.geometry.type === 'Polygon' ? [shape.geometry.coordinates] : shape.geometry.coordinates
  country.polygons.push(...polygons.map(p => p.map(r => r.map(([x, y]) => [Math.max(-180, Math.min(180, x)), Math.max(-90, Math.min(90, y))]))))
}
const refinements = JSON.parse(await readFile(new URL('./data/coastline-refinements.json', import.meta.url)))
for (const [id, refinement] of Object.entries(refinements)) {byId.get(id).polygons = refinement.polygons}
const bounds = ring => {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity
  for (const [x, y] of ring) {west = Math.min(west, x); east = Math.max(east, x); south = Math.min(south, y); north = Math.max(north, y)}
  return { west, east, south, north }
}
for (const country of countries) {
  if (!country.polygons.length) throw Error('Missing UN geometry: ' + country.id)
  country.small = Math.max(...country.polygons.map(p => {const b = bounds(p[0]); return (b.east - b.west) * (b.north - b.south)})) < 2
}
progress(.15, 'Build shared country topology')
let shared = topology({ countries: { type: 'FeatureCollection', features: countries.map(c => ({ type: 'Feature', id: c.id, properties: {}, geometry: { type: 'MultiPolygon', coordinates: c.polygons } })) } })
progress(.4, 'Prepare shared-arc simplification')
shared = presimplify(shared)
for (const shape of shared.objects.countries.geometries) {
  if (!byId.get(shape.id).small) continue
  for (const polygon of shape.arcs) for (const ring of polygon) for (const arc of ring) {
    for (const point of shared.arcs[arc < 0 ? ~arc : arc]) point[2] = Infinity
  }
}
progress(.65, 'Simplify shared arcs, retaining microstate detail')
const simplified = feature(simplify(shared, .0005), shared.objects.countries)
for (const shape of simplified.features) {byId.get(shape.id).polygons = shape.geometry.coordinates}
progress(.8, 'Check every quiz country and interior hint')
const pick = createCountryPicker(countries)
for (const country of countries) {
  if (pick(country.center)?.id === country.id) continue
  const rings = country.polygons.map(p => p[0]).sort((a, b) => b.length - a.length)
  let center
  for (const ring of rings) {
    const b = bounds(ring), candidates = []
    for (let x = 1; x < 40; x++) for (let y = 1; y < 40; y++) candidates.push([b.west + (b.east - b.west) * x / 40, b.south + (b.north - b.south) * y / 40])
    candidates.sort((a, b) => Math.hypot(a[0] - country.center[0], a[1] - country.center[1]) - Math.hypot(b[0] - country.center[0], b[1] - country.center[1]))
    center = candidates.find(c => pick(c)?.id === country.id)
    if (center) break
  }
  if (!center) throw Error('No interior hint for ' + country.id)
  country.center = center.map(n => Number(n.toFixed(5)))
}
validateCountries(countries)
progress(.95, 'Write verified country snapshot')
const json = JSON.stringify(countries), previous = JSON.parse(await readFile('public/data/globe/sources.json', 'utf8'))
await writeFile(`${outputDirectory}/countries.json`, json)
await writeFile(`${outputDirectory}/countries.json.gz`, gzipSync(json, { level: 9 }))
await writeFile(`${outputDirectory}/sources.json`, JSON.stringify({ ...previous, sources: { ...previous.sources, borders: source.href }, sha256: { ...previous.sha256, borders: createHash('sha256').update(bytes).digest('hex') }, countryCount: countries.length, markerOnly: [], background, attribution: 'Based on United Nations boundary data. Boundaries and names do not imply UN endorsement or acceptance.', sourceLayer: 'Countries Combined with associated territories', grouping: 'isoclr', coastlineRefinements: Object.entries(refinements).map(([id, { source, sourceSha256, reason }]) => ({ id, source, sourceSha256, reason })), preparedAt: new Date().toISOString() }, null, 2) + '\n')
progress(1, `${countries.length} UN-based quiz features, ${Buffer.byteLength(json)} bytes`)
