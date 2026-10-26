import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { createCountryPicker } from '../src/globe/geography.ts'

// Run only when deliberately updating the checked-in geography snapshot.
const sources = {
  borders: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson',
  detail: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_admin_0_countries.geojson',
  countries: 'https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json',
  earth: 'https://cdn.jsdelivr.net/npm/three-globe@2.44.0/example/img/earth-blue-marble.jpg',
}
const downloads = await Promise.all(Object.entries(sources).map(async ([name, url]) => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`)
  return [name, Buffer.from(await response.arrayBuffer())]
}))
const buffers = Object.fromEntries(downloads)
const catalog = JSON.parse(buffers.countries).filter(c => c.unMember || ['VAT', 'PSE'].includes(c.cca3))
if (catalog.length !== 195) throw new Error(`Expected 195 countries, received ${catalog.length}`)
const metadata = new Map(catalog.map(c => [c.cca3, c]))
const seen = new Set()
const countries = JSON.parse(buffers.borders).features.map(feature => {
  const p = feature.properties
  const id = p.ISO_A3 !== '-99' ? p.ISO_A3 : p.ADM0_A3
  const entry = metadata.get(id)
  if (entry) seen.add(id)
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  return {
    id,
    name: entry?.name.common ?? p.NAME_EN,
    continent: entry ? (entry.region === 'Americas' ? (entry.subregion === 'South America' ? 'South America' : 'North America') : entry.region) : p.CONTINENT,
    center: [p.LABEL_X, p.LABEL_Y],
    small: Math.max(...polygons.map(polygon => {
      const ring = polygon[0]
      return (Math.max(...ring.map(v => v[0])) - Math.min(...ring.map(v => v[0])))
        * (Math.max(...ring.map(v => v[1])) - Math.min(...ring.map(v => v[1])))
    })) < 2,
    playable: Boolean(entry),
    polygons: polygons.map(polygon => polygon.map(ring => ring.map(([x, y]) => [Number(x.toFixed(4)), Number(y.toFixed(4))]))),
  }
})
for (const entry of catalog.filter(c => !seen.has(c.cca3))) {
  countries.push({ id: entry.cca3, name: entry.name.common, continent: entry.region, center: [entry.latlng[1], entry.latlng[0]], small: true, playable: true, polygons: [] })
}
// The 50m map displaces some microstates for readability. Use 10m geometry for them.
const detailed = new Map(JSON.parse(buffers.detail).features.map(f => [f.properties.ISO_A3 !== '-99' ? f.properties.ISO_A3 : f.properties.ADM0_A3, f]))
for (const country of countries.filter(c => c.playable && c.small)) {
  const feature = detailed.get(country.id)
  if (!feature) throw new Error(`Missing detailed geometry for ${country.id}`)
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates
  country.polygons = polygons.map(polygon => polygon.map(ring => ring.map(([x, y]) => [Number(x.toFixed(5)), Number(y.toFixed(5))])))
}
countries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
// Cartographic label positions may be offshore. A locate hint needs an interior point.
const pick = createCountryPicker(countries)
for (const country of countries.filter(c => c.playable && pick(c.center)?.id !== c.id)) {
  const ring = country.polygons.map(p => p[0]).sort((a, b) => b.length - a.length)[0]
  if (!ring) continue
  const west = Math.min(...ring.map(v => v[0])), east = Math.max(...ring.map(v => v[0]))
  const south = Math.min(...ring.map(v => v[1])), north = Math.max(...ring.map(v => v[1]))
  const candidates = []
  for (let x = 1; x < 40; x++) for (let y = 1; y < 40; y++) candidates.push([west + (east - west) * x / 40, south + (north - south) * y / 40])
  candidates.sort((a, b) => Math.hypot(a[0] - country.center[0], a[1] - country.center[1]) - Math.hypot(b[0] - country.center[0], b[1] - country.center[1]))
  const center = candidates.find(c => pick(c)?.id === country.id)
  if (!center) throw new Error(`No interior hint position for ${country.name}`)
  country.center = center.map(n => Number(n.toFixed(5)))
}
await mkdir('public/data/globe', { recursive: true })
await writeFile('public/data/globe/countries.json', JSON.stringify(countries))
await writeFile('public/data/globe/countries.json.gz', gzipSync(JSON.stringify(countries), { level: 9 }))
await writeFile('public/data/globe/earth.jpg', buffers.earth)
await writeFile('public/data/globe/sources.json', JSON.stringify({
  sources,
  sha256: Object.fromEntries(downloads.map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])),
  countryCount: countries.filter(c => c.playable).length,
  markerOnly: countries.filter(c => c.playable && !c.polygons.length).map(c => c.name),
}, null, 2) + '\n')
console.log(`${countries.length} geographic features, ${countries.filter(c => c.playable).length} quiz countries; ${Math.round(buffers.earth.length / 1024)} KiB Earth texture`)
