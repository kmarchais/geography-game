import { readFileSync, existsSync } from 'node:fs'
import { expect, test } from 'vitest'
import { createCountryPicker } from './geography'
import { REGION_MODES, flagCode, regionalCountries, regionalDeck, validateRegionalCountries } from './regions'
import { createSession, answerCountry } from './game'
const data = validateRegionalCountries(JSON.parse(readFileSync('public/data/globe/regions.json', 'utf8')))
const world = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8'))
test('every world and regional prompt has a bundled flag', () => {
  for (const country of [...world, ...data]) {expect(existsSync(`public/data/globe/flags/${flagCode(country)}.svg`), country.id).toBe(true)}
})
test('regional centers pick their own territory rather than the parent country', () => {
  const pick = createCountryPicker(data)
  for (const country of data) {expect(pick(country.center)?.id, country.id).toBe(country.id)}
})
test('regional decks include requested islands, allow overlap and retain all selectable land', () => {
  const members = Object.fromEntries(REGION_MODES.map(mode => [mode,regionalDeck(regionalCountries(data,mode)).map(c=>c.id)]))
  for(const id of ['RUS','TUR','ARM','AZE','GEO','CYP']) {expect(members.europe).toContain(id);expect(members.asia).toContain(id)}
  for(const id of ['GUF','GLP','MTQ','MAF','BLM','FLK','SPM','ECU-GA','GRL']) {expect(members.americas).toContain(id)}
  for(const id of ['USA-HI','PYF','NCL','CHL-IPA']) {expect(members.oceania).toContain(id)}
  for(const id of ['ESP-CN','PRT-MA']) {expect(members.africa).toContain(id);expect(members.europe).toContain(id)}
  for(const id of ['PRT-AC','FRA-COR','ITA-SAR','ITA-SIC','ESP-IB','FRO','GRL','GRC-CRE','NOR-JM']) {expect(members.europe).toContain(id)}
  expect(members.africa).not.toContain('PRT-AC')
  for(const mode of REGION_MODES) {
    const countries=regionalCountries(data,mode), deck=regionalDeck(countries)
    expect(countries).toHaveLength(data.length)
    const session=createSession(deck)
    expect(session.deck).toHaveLength(members[mode]!.length)
    expect(session.deck.slice(0,Math.min(10,deck.filter(c=>!c.small).length)).every(c=>!c.small)).toBe(true)
    expect(answerCountry(session,session.deck[0],100).answers[0]?.outcome).toBe('correct')
  }
  expect(world).toHaveLength(195)
})


