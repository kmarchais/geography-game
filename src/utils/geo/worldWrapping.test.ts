import { describe, it, expect } from 'vitest'
import { createWorldWrappedCollection } from './worldWrapping'
import type { FeatureCollection, Point } from 'geojson'

describe('worldWrapping', () => {
  describe('createWorldWrappedCollection', () => {
    it('should create 3x copies of features (original + east + west)', () => {
      const data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'France' },
            geometry: { type: 'Point', coordinates: [2, 46] }
          },
          {
            type: 'Feature',
            properties: { name: 'USA' },
            geometry: { type: 'Point', coordinates: [-95, 37] }
          }
        ]
      }

      const wrapped = createWorldWrappedCollection(data)

      // Should have 6 features total (2 original + 2 east + 2 west)
      expect(wrapped.features).toHaveLength(6)
    })

    it('should mark east and west copies with properties', () => {
      const data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Test' },
            geometry: { type: 'Point', coordinates: [0, 0] }
          }
        ]
      }

      const wrapped = createWorldWrappedCollection(data, { markCopies: true })

      expect(wrapped.features).toHaveLength(3)

      // Original should not have markers
      expect(wrapped.features[0].properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[0].properties?.isWestCopy).toBeUndefined()

      // East copy should be marked
      expect(wrapped.features[1].properties?.isEastCopy).toBe(true)
      expect(wrapped.features[1].properties?.isWestCopy).toBeUndefined()

      // West copy should be marked
      expect(wrapped.features[2].properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[2].properties?.isWestCopy).toBe(true)
    })

    it('should shift coordinates correctly', () => {
      const data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Test' },
            geometry: { type: 'Point', coordinates: [10, 20] }
          }
        ]
      }

      const wrapped = createWorldWrappedCollection(data)

      // Original coordinates unchanged
      expect(wrapped.features[0].geometry.coordinates).toEqual([10, 20])

      // East copy shifted +360°
      expect(wrapped.features[1].geometry.coordinates).toEqual([370, 20])

      // West copy shifted -360°
      expect(wrapped.features[2].geometry.coordinates).toEqual([-350, 20])
    })

    it('should allow extracting unique entity names by filtering copies', () => {
      const data: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'France' },
            geometry: { type: 'Point', coordinates: [2, 46] }
          },
          {
            type: 'Feature',
            properties: { name: 'USA' },
            geometry: { type: 'Point', coordinates: [-95, 37] }
          }
        ]
      }

      const wrapped = createWorldWrappedCollection(data, { markCopies: true })

      // Extract unique entity names by filtering out wrapped copies
      const uniqueNames = wrapped.features
        .filter(f => !f.properties?.isEastCopy && !f.properties?.isWestCopy)
        .map(f => f.properties?.name)
        .filter((name): name is string => typeof name === 'string')

      // Should only have 2 unique names, not 6
      expect(uniqueNames).toEqual(['France', 'USA'])
      expect(uniqueNames).toHaveLength(2)
    })
  })
})
