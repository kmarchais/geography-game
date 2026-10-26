import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { coordinateToVector, createCountryPicker, validateCountries, vectorToCoordinate, type Country } from './geography'

const countries = validateCountries(JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8')))
const pick = createCountryPicker(countries)

describe('the checked-in geography', () => {
  it('has exactly 195 distinct quiz countries and includes microstates', () => {
    expect(countries.filter(c => c.playable)).toHaveLength(195)
    for (const id of ['VAT', 'MCO', 'NRU', 'TUV', 'PSE']) {expect(countries.find(c => c.id === id)?.playable).toBe(true)}
    expect(countries.filter(c => c.playable).every(c => c.polygons.length > 0)).toBe(true)
  })
  it.each([
    [2.35, 48.86, 'FRA'], [151.21, -33.86, 'AUS'], [-47.88, -15.79, 'BRA'],
    [139.69, 35.68, 'JPN'], [-77.04, 38.9, 'USA'], [177.98, -17.8, 'FJI'],
    [-172.4, -13.65, 'WSM'], [179.2096, -8.5137, 'TUV'], [12.4534, 41.903, 'VAT'],
    [28.23, -29.61, 'LSO'], [28.04, -26.2, 'ZAF'], [31.2, -26.5, 'SWZ'],
    [174.78, -41.29, 'NZL'], [-149.9, 61.22, 'USA'], [-42, 72, 'GRL'],
  ])('picks longitude %s, latitude %s as %s', (lon, lat, id) => expect(pick([lon as number, lat as number])?.id).toBe(id))
  it('does not count oceans as countries', () => {
    expect(pick([-30, 0])).toBeUndefined()
    expect(pick([0, 0])).toBeUndefined()
  })
  it.each([
    ['AND', ['FRA', 'ESP']], ['LIE', ['AUT', 'CHE']], ['VAT', ['ITA']], ['MCO', ['FRA']], ['SMR', ['ITA']],
  ] as const)('%s shares its detailed border with its neighbours', (id, neighbours) => {
    const country = countries.find(c => c.id === id)!
    const neighbourPoints = new Set(countries.filter(c => (neighbours as readonly string[]).includes(c.id)).flatMap(c => c.polygons.flat(2).map(p => p.join(','))))
    const boundary = country.polygons.flat(2)
    // Monaco also has a coastline; the other four are completely landlocked.
    const shared = boundary.filter(p => neighbourPoints.has(p.join(','))).length / boundary.length
    expect(shared).toBeGreaterThan(id === 'MCO' ? .3 : .95)
  })
  it('keeps every country label inside its own geographic feature', () => {
    const failures = countries.filter(c => c.playable && pick(c.center)?.id !== c.id).map(c => `${c.id}: picked ${pick(c.center)?.id}`)
    expect(failures).toEqual([])
  })
  it('rejects incomplete and malformed snapshots', () => {
    expect(() => validateCountries({})).toThrow()
    expect(() => validateCountries(countries.slice(0, 190))).toThrow()
    expect(() => validateCountries([...countries, countries[0]])).toThrow()
    expect(() => validateCountries(countries.map((c, i) => i === 0 ? { ...c, center: [NaN, 0] } : c))).toThrow()
  })
})

describe('spherical picking', () => {
  it.each([[-179, 70], [179, -30], [0, 0], [90, 45], [-45, -89]])('round trips longitude %s and latitude %s', (lon, lat) => {
    const [x, y, z] = coordinateToVector([lon, lat])
    const result = vectorToCoordinate({ x, y, z })
    expect(result[0]).toBeCloseTo(lon, 8)
    expect(result[1]).toBeCloseTo(lat, 8)
  })
  it('handles a polygon crossing the antimeridian and its hole', () => {
    const country: Country = { id: 'test', name: 'Test', continent: 'Oceania', center: [175, 0], small: false, playable: true, polygons: [[[[170, -20], [-170, -20], [-170, 20], [170, 20], [170, -20]], [[175, -5], [-175, -5], [-175, 5], [175, 5], [175, -5]]]] }
    const picker = createCountryPicker([country])
    expect(picker([172, 0])).toBe(country)
    expect(picker([-172, 0])).toBe(country)
    expect(picker([180, 0])).toBeUndefined()
    expect(picker([0, 0])).toBeUndefined()
    expect(picker([532, 0])).toBe(country)
    expect(picker([NaN, 0])).toBeUndefined()
    expect(picker([0, 95])).toBeUndefined()
  })
})
