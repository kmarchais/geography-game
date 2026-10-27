import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { createCountryPicker, validateCountries } from './geography'
import { createSession, answerCountry } from './game'
const countries = validateCountries(JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')))
it('every selectable territory belongs to exactly one country in the challenge', () => {
  const pick = createCountryPicker(countries)
  const deck = new Set(createSession(countries).deck.map(c => c.id))
  const extras = countries.filter(c => !c.playable && pick(c.center)?.id === c.id).map(c => c.id)
  expect(extras).toEqual([])
  for (const country of countries.filter(c => c.playable)) {expect(deck.has(pick(country.center)!.id)).toBe(true)}
})

it('a finished challenge resolves every selectable country exactly once', () => {
  let session = createSession(countries)
  for (const country of session.deck) {session = answerCountry(session, country, 1000)}
  expect(session.phase).toBe('complete')
  expect(new Set(session.answers.map(a => a.id))).toEqual(new Set(countries.filter(c => c.playable).map(c => c.id)))
  const pick = createCountryPicker(countries)
  for (const country of countries) {
    const picked = pick(country.center)
    if (picked) {expect(session.answers.some(answer => answer.id === picked.id)).toBe(true)}
  }

})

it('uses exactly the quiz countries as rendered geographic features', () => {
  expect(countries).toHaveLength(195)
  expect(countries.every(country => country.playable)).toBe(true)
})
it.each([
  [[-42, 72], 'DNK'], [[46, 9], 'SOM'], [[21, 42.6], 'SRB'],
  [[121, 24], 'CHN'], [[33.5, 35.25], 'CYP'], [[-66.5, 18.2], 'USA'],
  [[-53, 4], 'FRA'], [[-149.57, -17.55], 'FRA'], [[165.5, -21.5], 'FRA'],
  [[34, 45], 'UKR'], [[35.25, 31.9], 'PSE'], [[34.40, 31.47], 'PSE'],
] as const)('groups UN source territory at %s with %s', (coordinate, id) => {
  expect(createCountryPicker(countries)([...coordinate])?.id).toBe(id)
})

it('matches every ISO ID in the documented 193-member plus two-observer list', () => {
  const documented = [...readFileSync('docs/country-list.md', 'utf8').matchAll(/\| ([A-Z]{3}) \|/g)].map(match => match[1])
  expect(documented).toHaveLength(195)
  expect(countries.map(country => country.id).sort()).toEqual(documented.sort())
})
