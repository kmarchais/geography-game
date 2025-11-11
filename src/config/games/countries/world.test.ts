import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '../../../utils/geo/processors'
import worldCountriesConfig from './world.json'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geojsonUtils'

describe('World Countries Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(async () => {
    // Fetch the GeoJSON data
    const response = await fetch(worldCountriesConfig.config.dataUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.status}`)
    }
    const data: FeatureCollection<Geometry, GeoJSONProperties> = await response.json()

    // Apply processors as configured
    if (worldCountriesConfig.config.processors) {
      processedData = applyProcessors(data, worldCountriesConfig.config.processors)
    } else {
      processedData = data
    }
  }, 30000) // 30 second timeout for network request

  it('should have exactly 241 unique territories', () => {
    // Extract unique entity names by filtering out world-wrapped copies
    // This matches the logic in MapGame.vue
    const uniqueEntities = processedData.features
      .filter((feature) => {
        // Only include original features (not wrapped copies)
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => feature.properties?.[worldCountriesConfig.config.propertyName])
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    // Should have exactly 241 countries
    expect(uniqueEntities).toHaveLength(241)
  })

  it('should create 723 total features after world wrapping (241 × 3)', () => {
    // After world wrapping, should have 3x the original features
    expect(processedData.features).toHaveLength(723)
  })

  it('should have worldWrapping processor configured', () => {
    expect(worldCountriesConfig.config.processors).toContain('worldWrapping')
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

    // Should have equal counts: 241 original + 241 east + 241 west = 723
    expect(originals).toHaveLength(241)
    expect(eastCopies).toHaveLength(241)
    expect(westCopies).toHaveLength(241)
  })

  it('should have all entities with valid names', () => {
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => feature.properties?.[worldCountriesConfig.config.propertyName])

    // All should be strings
    uniqueEntities.forEach((name) => {
      expect(typeof name).toBe('string')
      expect(name).not.toBe('')
      expect(name).not.toBe('Unknown')
    })
  })

  it('should have correct game metadata', () => {
    expect(worldCountriesConfig.id).toBe('world-countries')
    expect(worldCountriesConfig.name).toBe('World Countries')
    expect(worldCountriesConfig.category).toBe('countries')
    expect(worldCountriesConfig.difficulty).toBe(4)
    expect(worldCountriesConfig.featured).toBe(true)
  })

  it('should have correct map configuration', () => {
    const config = worldCountriesConfig.config

    expect(config.mapCenter).toEqual([20, 0])
    expect(config.zoom).toBe(2)
    expect(config.propertyName).toBe('name')
    expect(config.targetLabel).toBe('Country')
  })
})
