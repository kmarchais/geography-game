import { describe, it, expect, beforeAll } from 'vitest'
import { applyProcessors } from '../../../utils/geo/processors'
import oceaniaConfig from './oceania.json'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from '../../../utils/geojsonUtils'

describe('Oceania Countries Game Configuration', () => {
  let processedData: FeatureCollection<Geometry, GeoJSONProperties>

  beforeAll(async () => {
    // Fetch the GeoJSON data
    const response = await fetch(oceaniaConfig.config.dataUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch GeoJSON: ${response.status}`)
    }
    const data: FeatureCollection<Geometry, GeoJSONProperties> = await response.json()

    // Apply processors as configured (filterOceania + worldWrapping)
    if (oceaniaConfig.config.processors) {
      processedData = applyProcessors(data, oceaniaConfig.config.processors)
    } else {
      processedData = data
    }
  }, 30000) // 30 second timeout for network request

  it('should have exactly 24 unique Oceanian territories', () => {
    // Extract unique entity names by filtering out world-wrapped copies
    const uniqueEntities = processedData.features
      .filter((feature) => {
        // Only include original features (not wrapped copies)
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => feature.properties?.[oceaniaConfig.config.propertyName])
      .filter((name): name is string =>
        typeof name === 'string' && name.trim() !== '' && name !== 'Unknown'
      )

    // Oceania has 24 countries (including Australia, New Zealand, Papua New Guinea,
    // Fiji, Solomon Islands, Vanuatu, Samoa, Tonga, Kiribati, etc.)
    expect(uniqueEntities).toHaveLength(24)
  })

  it('should create 72 total features after world wrapping (24 × 3)', () => {
    // After world wrapping, should have 3x the original features
    expect(processedData.features).toHaveLength(72)
  })

  it('should have filterOceania and worldWrapping processors configured', () => {
    expect(oceaniaConfig.config.processors).toContain('filterOceania')
    expect(oceaniaConfig.config.processors).toContain('worldWrapping')
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

    // Should have equal counts: 24 original + 24 east + 24 west = 72
    expect(originals).toHaveLength(24)
    expect(eastCopies).toHaveLength(24)
    expect(westCopies).toHaveLength(24)
  })

  it('should have correct game metadata', () => {
    expect(oceaniaConfig.id).toBe('oceania-countries')
    expect(oceaniaConfig.name).toBe('Oceanian Countries')
    expect(oceaniaConfig.category).toBe('countries')
    expect(oceaniaConfig.difficulty).toBe(2)
    expect(oceaniaConfig.featured).toBe(true)
  })

  it('should have correct map configuration for Pacific region', () => {
    const config = oceaniaConfig.config

    // Centered on Pacific Ocean
    expect(config.mapCenter).toEqual([-15, 160])
    expect(config.zoom).toBe(3)
    expect(config.propertyName).toBe('name')
    expect(config.targetLabel).toBe('Country')
  })

  it('should include major Oceanian countries', () => {
    const uniqueEntities = processedData.features
      .filter((feature) => {
        const props = feature.properties as any
        return !props?.isEastCopy && !props?.isWestCopy
      })
      .map((feature) => feature.properties?.[oceaniaConfig.config.propertyName])

    // Check for some major countries
    expect(uniqueEntities).toContain('Australia')
    expect(uniqueEntities).toContain('New Zealand')
    expect(uniqueEntities).toContain('Papua New Guinea')
    expect(uniqueEntities).toContain('Fiji')
  })
})
