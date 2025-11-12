import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '../../../utils/geo/processors'
import gameConfig from './belgian-provinces.json'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geo/../geojsonUtils'

describe('Belgian Provinces Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(async () => {
    // Local file - read from public directory
    const fs = await import('fs')
    const path = await import('path')
    const localPath = path.join(process.cwd(), 'public', gameConfig.config.dataUrl.substring(2))
    const fileContent = fs.readFileSync(localPath, 'utf-8')
    const data: FeatureCollection<Geometry, GeoJSONProperties> = JSON.parse(fileContent)

    // Apply processors as configured
    if (gameConfig.config.processors) {
      processedData = applyProcessors(data, gameConfig.config.processors)
    } else {
      processedData = data
    }
  }, 30000) // 30 second timeout for network request

  it('should have exactly 11 unique territories', () => {
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

    expect(uniqueEntities).toHaveLength(11)
  })

  it('should have 11 total features', () => {
    expect(processedData.features).toHaveLength(11)
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
    expect(gameConfig.id).toBe('belgian-provinces')
    expect(gameConfig.name).toBe('Belgian Provinces')
    expect(gameConfig.category).toBe('divisions')
  })
})
