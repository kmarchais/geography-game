/// <reference types="node" />
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyProcessors } from '../../../utils/geo/processors'
import gameConfigJson from './london-boroughs.json'
import type { GameDefinition } from '../../../types/gameRegistry'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geo/../geojsonUtils'

const gameConfig = gameConfigJson as GameDefinition

describe('London Boroughs Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(() => {
    const filename = gameConfig.config.dataUrl.split('/').pop() || ''
    const localPath = join(process.cwd(), 'public', 'data', filename)
    const fileContent = readFileSync(localPath, 'utf-8')
    const data: FeatureCollection<Geometry, GeoJSONProperties> = JSON.parse(fileContent)

    // Apply processors as configured
    if (gameConfig.config.processors) {
      processedData = applyProcessors(data, gameConfig.config.processors) as FeatureCollection<Geometry, GeoJSONProperties>
    } else {
      processedData = data
    }
  })

  it('should have exactly 33 unique territories', () => {
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

    expect(uniqueEntities).toHaveLength(33)
    expect(uniqueEntities).toContain('City of London')
  })

  it('should have 33 total features', () => {
    expect(processedData.features).toHaveLength(33)
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
    expect(gameConfig.id).toBe('london-boroughs')
    expect(gameConfig.name).toBe('London Boroughs')
    expect(gameConfig.category).toBe('cities')
    expect(gameConfig.config.dataUrl).toBe('/data/london-boroughs.geojson')
  })
})
