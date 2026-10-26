import { readFileSync, writeFileSync } from 'node:fs'
const url = 'https://cdn.jsdelivr.net/npm/world-countries@5.1.0/countries.json'
const response = await fetch(url)
if (!response.ok) {throw new Error(`Country names: HTTP ${response.status}`)}
const countries = await response.json()
const names = Object.fromEntries(countries.map(country => [country.cca3, country.translations.fra.common]).sort(([a], [b]) => a.localeCompare(b, 'en')))
for (const country of JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')).filter(country => country.playable)) {
  if (!names[country.id]) {throw new Error(`Missing French name: ${country.id}`)}
}
writeFileSync('public/data/globe/names.fr.json', JSON.stringify(names, null, 2) + '\n')
console.log(`Prepared ${Object.keys(names).length} French country names from world-countries 5.1.0`)
