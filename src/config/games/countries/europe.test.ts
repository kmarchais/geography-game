import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '../../../utils/geo/processors'
import gameConfigJson from './europe.json'
import type { GameDefinition } from '../../../types/gameRegistry'

const gameConfig = gameConfigJson as GameDefinition
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geo/../geojsonUtils'

describe('European Countries Game Configuration', () => {
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

  it('should have exactly 55 unique territories', () => {
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

    expect(uniqueEntities).toHaveLength(55)
  })

  it('should have 55 total features', () => {
    expect(processedData.features).toHaveLength(55)
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
    expect(gameConfig.id).toBe('europe-countries')
    expect(gameConfig.name).toBe('European Countries')
    expect(gameConfig.category).toBe('countries')
  })
})
