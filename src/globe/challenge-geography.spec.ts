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
  for (const id of ['GRL', 'SOL', 'ESH', 'KOS']) {expect(pick(countries.find(c => c.id === id)!.center)).toBeUndefined()}
})
