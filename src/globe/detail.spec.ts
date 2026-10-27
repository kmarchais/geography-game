import { describe, expect, it } from 'vitest'
import { answerColor, imageryTiles, imageryUrl, islandBlend, rotationSpeed, revealDistance } from './detail'
import { readFileSync } from 'node:fs'
import type { Country } from './geography'

describe('globe detail', () => {
  it('colours first, second, and third attempts green, yellow, and orange, and failures red', () => {
    const answer = { id: 'TCD', name: 'Chad', outcome: 'correct' as const, attempt: 1 }
    expect(answerColor(undefined)).toBeUndefined()
    expect(answerColor(answer)).toBe('#48e7b0')
    expect(answerColor({ ...answer, attempt: 2 })).toBe('#f4d35e')
    expect(answerColor({ ...answer, attempt: 3 })).toBe('#f49b42')
    expect(answerColor({ ...answer, outcome: 'missed', attempt: 3 })).toBe('#ff4c58')
    expect(answerColor({ ...answer, outcome: 'skipped' })).toBe('#ff4c58')
  })
  it('reveals small countries with geographic context instead of a surface-level zoom', () => {
    const countries: Country[] = JSON.parse(readFileSync('public/data/globe/countries.json', 'utf8'))
    for (const id of ['AND', 'VAT', 'AFG', 'RUS']) {
      for (const aspect of [.5, 1, 2]) {
        const distance = revealDistance(countries.find(country => country.id === id)!, aspect)
        expect(distance).toBeGreaterThanOrEqual(1.2)
        expect(distance).toBeLessThanOrEqual(3.1)
      }
    }
    expect(revealDistance(countries.find(country => country.id === 'AND')!, 1)).toBe(1.2)
  })
  it('slows rotation as the camera approaches the surface without stopping it', () => {
    expect(rotationSpeed(3.1)).toBeCloseTo(.65)
    expect(rotationSpeed(1.1)).toBeLessThan(rotationSpeed(2))
    expect(rotationSpeed(1.025)).toBeGreaterThan(0)
    expect(rotationSpeed(1.002)).toBeLessThan(rotationSpeed(1.025))
    expect(rotationSpeed(10)).toBe(.65)
  })
  it('crossfades tiny-country markers into visible territory', () => {
    expect(islandBlend(2)).toBe(0)
    expect(islandBlend(15)).toBeCloseTo(.5)
    expect(islandBlend(40)).toBe(1)
    expect(islandBlend(2, 1.002)).toBeCloseTo(1)
  })
  it('does not fetch tiles in the whole-planet view', () => expect(imageryTiles([0, 0], 3.1, 1.5, 700)).toEqual([]))
  it.each([[179, 0], [-179, 0], [0, 89], [0, -89], [20, 16]])('bounds the tile set around %s, %s', (lon, lat) => {
    const tiles = imageryTiles([lon, lat], 1.14, 1.5, 700)
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.length).toBeLessThanOrEqual(24)
    expect(new Set(tiles.map(t => t.key)).size).toBe(tiles.length)
    expect(tiles.every(t => t.west >= -180 && t.west + t.span <= 180 && t.north <= 90 && t.north - t.latitudeSpan >= -90)).toBe(true)
  })
  it('covers all longitudes when the visible footprint crosses a pole', () => {
    const tiles = imageryTiles([0, 89], 1.14, 1.5, 700)
    const topRow = tiles.filter(t => t.row === 0)
    expect(topRow.length * topRow[0]!.span).toBe(360)
    expect(tiles.length).toBeLessThanOrEqual(24)
  })
  it('increases imagery detail with zoom and uses the verified NASA tile grid', () => {
    const close = imageryTiles([20, 16], 1.025, 1.5, 700)[0]!
    const far = imageryTiles([20, 16], 1.8, 1.5, 700)[0]!
    expect(close.level).toBeGreaterThan(far.level)
    expect(imageryUrl(close)).toContain('/500m/7/')
    expect(far.span).toBe(288 / 2 ** far.level)
  })
})
