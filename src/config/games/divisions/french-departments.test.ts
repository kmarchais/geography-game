import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '../../../utils/geo/processors'
import gameConfigJson from './french-departments.json'
import type { GameDefinition } from '../../../types/gameRegistry'

const gameConfig = gameConfigJson as GameDefinition
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geo/../geojsonUtils'

// Import the marker function module to count territories
import * as frenchTerritoriesModule from '../../../utils/markers/frenchTerritories'

// Skipped due to CORS issues with GitHub raw content in test environment
describe.skip('French Departments Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(async () => {
    // Fetch the GeoJSON data from remote URL
    const response = await fetch(gameConfig.config.dataUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.status}`)
    }
    const data: FeatureCollection<Geometry, GeoJSONProperties> = await response.json()

    // Apply processors as configured
    if (gameConfig.config.processors) {
      processedData = applyProcessors(data, gameConfig.config.processors) as FeatureCollection<Geometry, GeoJSONProperties>
    } else {
      processedData = data
    }
  }, 30000) // 30 second timeout for network request

  it('should have exactly 101 unique territories from GeoJSON', () => {
    // Note: The full game has 109 territories (101 from GeoJSON + 8 from frenchTerritories marker function)
    // This test only validates the GeoJSON data

    // Extract unique entity names by filtering out world-wrapped copies
    const uniqueEntities = processedData.features
      .filter((feature) => {
        // Only include original features (not wrapped copies)
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => {
        const value = feature.properties?.[gameConfig.config.propertyName]
        // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
        return typeof value === 'number' ? String(value) : value
      })
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    expect(uniqueEntities).toHaveLength(101)
  })

  it('should have 303 total features after world wrapping (101 × 3)', () => {
    expect(processedData.features).toHaveLength(303)
  })

  it('should mark wrapped copies with isEastCopy and isWestCopy', () => {
    const eastCopies = processedData.features.filter(
      (f) => (f.properties as any)?.isEastCopy
    )
    const westCopies = processedData.features.filter(
      (f) => (f.properties as any)?.isWestCopy
    )
    const originals = processedData.features.filter(
      (f) => !(f.properties as any)?.isEastCopy && !(f.properties as any)?.isWestCopy
    )

    expect(originals).toHaveLength(101)
    expect(eastCopies).toHaveLength(101)
    expect(westCopies).toHaveLength(101)
  })

  it('should have all entities with valid names', () => {
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => {
        const value = feature.properties?.[gameConfig.config.propertyName]
        // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
        return typeof value === 'number' ? String(value) : value
      })

    uniqueEntities.forEach((name) => {
      expect(typeof name).toBe('string')
      expect(name).not.toBe('')
      expect(name).not.toBe('Unknown')
    })
  })

  it('should have correct game metadata', () => {
    expect(gameConfig.id).toBe('french-departments')
    expect(gameConfig.name).toBe('French Departments')
    expect(gameConfig.category).toBe('divisions')
  })

  it('should have totalRounds set to 109 (101 from GeoJSON + 8 from marker function)', () => {
    // The game uses 101 territories from the GeoJSON file
    // plus 8 additional overseas territories added via the frenchTerritories marker function:
    // Saint Pierre et Miquelon, Wallis et Futuna, Polynésie Française,
    // Nouvelle-Calédonie, Terres Australes et Antarctiques Françaises,
    // Saint-Martin, Saint-Barthélemy, Île de Clipperton
    expect(gameConfig.config.totalRounds).toBe(109)
  })
})

// Skip in CI when SKIP_INTEGRATION_TESTS is set (external API calls are flaky)
const shouldSkip = process.env.SKIP_INTEGRATION_TESTS === 'true' || (process.env.SKIP_INTEGRATION_TESTS as any) === true;
const describeOrSkip = shouldSkip ? describe.skip : describe;

describeOrSkip('French Territories Marker Function', () => {
  it('should define exactly 8 additional overseas territories', () => {
    expect(frenchTerritoriesModule.additionalTerritories).toHaveLength(8)
  })

  it('should have all territories with valid names, coordinates, and codes', () => {
    frenchTerritoriesModule.additionalTerritories.forEach((territory) => {
      expect(territory.name).toBeTruthy()
      expect(typeof territory.name).toBe('string')
      expect(territory.name.length).toBeGreaterThan(0)

      expect(typeof territory.lat).toBe('number')
      expect(territory.lat).toBeGreaterThanOrEqual(-90)
      expect(territory.lat).toBeLessThanOrEqual(90)

      expect(typeof territory.lng).toBe('number')
      expect(territory.lng).toBeGreaterThanOrEqual(-180)
      expect(territory.lng).toBeLessThanOrEqual(180)

      expect(territory.code).toBeTruthy()
      expect(typeof territory.code).toBe('string')
    })
  })

  it('should match the expected 8 overseas territories', () => {
    const expectedNames = [
      'Saint Pierre et Miquelon',
      'Wallis et Futuna',
      'Polynésie Française',
      'Nouvelle-Calédonie',
      'Terres Australes et Antarctiques Françaises',
      'Saint-Martin',
      'Saint-Barthélemy',
      'Île de Clipperton'
    ]

    const actualNames = frenchTerritoriesModule.additionalTerritories.map(t => t.name)
    expect(actualNames).toEqual(expectedNames)
  })
})
