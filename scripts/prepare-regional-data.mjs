import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { createCountryPicker } from '../src/globe/geography.ts'

// Explicit preparation only. Keep the world challenge snapshot unchanged.
const rawBytes = await readFile(process.argv[2] || '.local/regional-un.json')
const raw = JSON.parse(rawBytes)
const catalog = JSON.parse(await readFile(process.argv[3] || '.local/world-country-catalog.json'))
const world = JSON.parse(await readFile('public/data/globe/countries.json'))
const byCode = new Map(catalog.map(c => [c.cca3, c]))
const shapes = new Map()
for (const f of raw.features) {
  const id = f.properties.iso3cd
  if (!byCode.has(id) || world.some(c => c.id === id) || ['ATA', 'BVT', 'HMD', 'ATF', 'UMI'].includes(id)) continue
  const item = shapes.get(id) || { id, parent: f.properties.isoclr, polygons: [] }
  item.polygons.push(...(f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates))
  shapes.set(id, item)
}
const region = c => ['Americas', 'Antarctic'].includes(c.region) ? 'americas' : c.region.toLowerCase()
const display = new Intl.DisplayNames('fr', { type: 'region' })
const entries = [...shapes.values()].map(s => {
  const c = byCode.get(s.id)
  return { ...s, name: c.name.common, nameFr: display.of(c.cca2), flag: c.cca2.toLowerCase(), regions: [region(c)], center: [c.latlng[1], c.latlng[0]], polygons: [] }
})
const bbox = p => {const r=p[0];return [Math.min(...r.map(p=>p[0])),Math.min(...r.map(p=>p[1])),Math.max(...r.map(p=>p[0])),Math.max(...r.map(p=>p[1]))]}
const masks = [...shapes.values()].flatMap(s=>s.polygons.map(p=>({id:s.id,parent:s.parent,b:bbox(p)})))
const custom = [
 ['USA-AK','Alaska','Alaska','USA',['americas'],[-180,50,-129,73],[-150,64]],
 ['USA-HI','Hawaii','Hawaï','USA',['oceania'],[-180,18,-154,29],[-155.6,19.6]],
 ['ECU-GA','Galápagos Islands','Îles Galápagos','ECU',['americas'],[-93,-2,-89,2],[-90.5,-.6]],
 ['CHL-IPA','Easter Island','Île de Pâques','CHL',['oceania'],[-110,-28,-108,-26],[-109.35,-27.12]],
 ['CHL-JF','Juan Fernández Islands','Îles Juan Fernández','CHL',['americas'],[-82,-35,-78,-32],[-78.85,-33.64]],
 ['ESP-CN','Canary Islands','Îles Canaries','ESP',['africa','europe'],[-19,27,-13,30],[-15.6,28]],
 ['PRT-MA','Madeira','Madère','PRT',['africa','europe'],[-18,30,-15,34],[-16.95,32.75]],
 ['PRT-AC','Azores','Açores','PRT',['europe'],[-32,36,-24,41],[-25.5,37.8]],
 ['FRA-COR','Corsica','Corse','FRA',['europe'],[8.4,41.3,9.7,43.1],[9.1,42.1]],
 ['ITA-SAR','Sardinia','Sardaigne','ITA',['europe'],[8,38.8,10,41.4],[9,40]],
 ['ITA-SIC','Sicily','Sicile','ITA',['europe'],[11.8,36.5,15.7,38.9],[14,37.5]],
 ['ESP-IB','Balearic Islands','Îles Baléares','ESP',['europe'],[1,38.5,4.5,40.2],[3,39.6]],
 ['GRC-CRE','Crete','Crète','GRC',['europe'],[23.4,34.7,26.5,35.8],[24.9,35.2]],
 ['NOR-JM','Jan Mayen','Jan Mayen','NOR',['europe'],[-10,70,-7,72],[-8.4,71]],
]
for(const [id,name,nameFr,parent,regions,b,center] of custom) {
 entries.push({id,name,nameFr,parent,regions,center,flag:byCode.get(parent).cca2.toLowerCase(),polygons:[]})
 masks.unshift({id,parent,b})
}
// Split the exact existing land polygons; never cut across mainland borders.
const expanded = world.map(c => ({...c, polygons:[], regions:[c.continent.includes('America')?'americas':c.continent.toLowerCase()], flag:byCode.get(c.id).cca2.toLowerCase()}))
for(const country of world) for(const polygon of country.polygons) {
 const b=bbox(polygon)
 const mask=masks.find(m=>m.parent===country.id && b[0]>=m.b[0]-.002 && b[1]>=m.b[1]-.002 && b[2]<=m.b[2]+.002 && b[3]<=m.b[3]+.002)
 ;(mask ? entries.find(e=>e.id===mask.id) : expanded.find(c=>c.id===country.id)).polygons.push(polygon)
}
for(const entry of entries) {
 if(!entry.polygons.length && shapes.has(entry.id)) {
  // Territories absent from the combined snapshot retain UN separated geometry.
  entry.polygons = shapes.get(entry.id).polygons.map(p=>p.map(r=>{const step=Math.max(1,Math.ceil(r.length/1500));const ring=r.filter((_,i)=>i%step===0);if(ring.at(-1)!==ring[0])ring.push(ring[0]);return ring}))
 }
 if(!entry.polygons.length) throw Error('No polygons: '+entry.id)
 expanded.push({...entry,playable:true,small:true,continent:byCode.get(entry.id)?.region||entry.regions[0]})
}
for(const id of ['RUS','TUR','ARM','AZE','GEO','CYP']) expanded.find(c=>c.id===id).regions=['europe','asia']
expanded.find(c=>c.id==='GRL').regions=['americas','europe']
expanded.find(c=>c.id==='SJM').name='Svalbard'
expanded.find(c=>c.id==='SJM').nameFr='Svalbard'
for(const c of expanded) {
 let pick=createCountryPicker([c])
 if (shapes.has(c.id) && !pick(c.center)) {c.polygons=shapes.get(c.id).polygons;pick=createCountryPicker([c])}
 if(!pick(c.center)) {
  let found
  for(const p of [...c.polygons].sort((a,b)=>b[0].length-a[0].length)) {
   const b=bbox(p)
   for(let x=1;x<20&&!found;x++)for(let y=1;y<20&&!found;y++){const point=[b[0]+(b[2]-b[0])*x/20,b[1]+(b[3]-b[1])*y/20];if(pick(point))found=point}
   if(found)break
  }
  if(!found)throw Error('No interior: '+c.id)
  c.center=found.map(n=>+n.toFixed(5))
 }
 c.small=Math.max(...c.polygons.map(p=>{const b=bbox(p);return(b[2]-b[0])*(b[3]-b[1])}))<2
}
const json=JSON.stringify(expanded)
await writeFile('public/data/globe/regions.json',json)
await writeFile('public/data/globe/regions.json.gz',gzipSync(json,{level:9}))
await writeFile('public/data/globe/regions-sources.json',JSON.stringify({source:'https://data-gis.unep-wcmc.org/server/rest/services/Hosted/UN_Boundaries/MapServer/5',sourceSha256:createHash('sha256').update(rawBytes).digest('hex'),base:'countries.json',method:'Existing country polygons split by separated-territory bounds and explicit island bounds. Missing territories use simplified separated UN polygons.',customSplits:custom,attribution:'Boundaries and names do not imply UN endorsement or acceptance.'},null,2)+'\n')
await mkdir('server/data', {recursive:true})
await writeFile('server/data/regional-catalog.json', JSON.stringify({dataset:createHash('sha256').update(json).digest('hex'),countries:expanded.map(({id,small,playable,regions})=>({id,small,playable,regions}))})+'\n')
console.log(expanded.length,Buffer.byteLength(json),Object.fromEntries(['americas','europe','africa','asia','oceania'].map(r=>[r,expanded.filter(c=>c.regions.includes(r)).length])))


