import { describe, it, expect } from 'vitest'
import type { FeatureCollection, Point, Polygon } from 'geojson'
import { createWorldWrappedCollection } from './worldWrapping'

describe('worldWrapping', () => {
  describe('createWorldWrappedCollection', () => {
    it('should create east and west copies of features', () => {
      const originalCollection: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0],
            },
            properties: { name: 'Origin' },
          },
        ],
      }

      const wrapped = createWorldWrappedCollection(originalCollection)

      // Should have 3 features: original + east copy + west copy
      expect(wrapped.features).toHaveLength(3)

      // Original feature should be unchanged
      expect(wrapped.features[0]?.geometry.coordinates).toEqual([0, 0])
      expect(wrapped.features[0]?.properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[0]?.properties?.isWestCopy).toBeUndefined()

      // East copy should be shifted +360
      expect(wrapped.features[1]?.geometry.coordinates).toEqual([360, 0])
      expect(wrapped.features[1]?.properties?.isEastCopy).toBe(true)

      // West copy should be shifted -360
      expect(wrapped.features[2]?.geometry.coordinates).toEqual([-360, 0])
      expect(wrapped.features[2]?.properties?.isWestCopy).toBe(true)
    })

    it('should not mutate the original collection', () => {
      const originalCollection: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [10, 20],
            },
            properties: { name: 'Test' },
          },
        ],
      }

      const originalCopy = structuredClone(originalCollection)
      const wrapped = createWorldWrappedCollection(originalCollection)

      // Original should be unchanged
      expect(originalCollection).toEqual(originalCopy)
      expect(originalCollection.features).toHaveLength(1)

      // Wrapped should have 3 features
      expect(wrapped.features).toHaveLength(3)
    })

    it('should handle multiple features', () => {
      const originalCollection: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { name: 'A' },
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10, 10] },
            properties: { name: 'B' },
          },
        ],
      }

      const wrapped = createWorldWrappedCollection(originalCollection)

      // Should have 6 features (2 originals + 2 east + 2 west)
      expect(wrapped.features).toHaveLength(6)

      // Check ordering: originals first, then east copies, then west copies
      expect(wrapped.features[0]?.properties?.name).toBe('A')
      expect(wrapped.features[0]?.properties?.isEastCopy).toBeUndefined()

      expect(wrapped.features[1]?.properties?.name).toBe('B')
      expect(wrapped.features[1]?.properties?.isEastCopy).toBeUndefined()

      expect(wrapped.features[2]?.properties?.name).toBe('A')
      expect(wrapped.features[2]?.properties?.isEastCopy).toBe(true)

      expect(wrapped.features[3]?.properties?.name).toBe('B')
      expect(wrapped.features[3]?.properties?.isEastCopy).toBe(true)

      expect(wrapped.features[4]?.properties?.name).toBe('A')
      expect(wrapped.features[4]?.properties?.isWestCopy).toBe(true)

      expect(wrapped.features[5]?.properties?.name).toBe('B')
      expect(wrapped.features[5]?.properties?.isWestCopy).toBe(true)
    })

    it('should handle Polygon features', () => {
      const originalCollection: FeatureCollection<Polygon> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [0, 0],
                  [10, 0],
                  [10, 10],
                  [0, 10],
                  [0, 0],
                ],
              ],
            },
            properties: { name: 'Square' },
          },
        ],
      }

      const wrapped = createWorldWrappedCollection(originalCollection)

      expect(wrapped.features).toHaveLength(3)

      // Check east copy polygon coordinates
      const eastCopy = wrapped.features[1]
      if (eastCopy?.geometry.type === 'Polygon') {
        expect(eastCopy.geometry.coordinates[0]?.[0]).toEqual([360, 0])
        expect(eastCopy.geometry.coordinates[0]?.[1]).toEqual([370, 0])
      }

      // Check west copy polygon coordinates
      const westCopy = wrapped.features[2]
      if (westCopy?.geometry.type === 'Polygon') {
        expect(westCopy.geometry.coordinates[0]?.[0]).toEqual([-360, 0])
        expect(westCopy.geometry.coordinates[0]?.[1]).toEqual([-350, 0])
      }
    })

    it('should not mark copies when markCopies option is false', () => {
      const originalCollection: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: { name: 'Test' },
          },
        ],
      }

      const wrapped = createWorldWrappedCollection(originalCollection, { markCopies: false })

      expect(wrapped.features).toHaveLength(3)

      // None of the features should have isEastCopy or isWestCopy
      expect(wrapped.features[0]?.properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[0]?.properties?.isWestCopy).toBeUndefined()

      expect(wrapped.features[1]?.properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[1]?.properties?.isWestCopy).toBeUndefined()

      expect(wrapped.features[2]?.properties?.isEastCopy).toBeUndefined()
      expect(wrapped.features[2]?.properties?.isWestCopy).toBeUndefined()

      // But coordinates should still be shifted
      expect(wrapped.features[1]?.geometry.coordinates).toEqual([360, 0])
      expect(wrapped.features[2]?.geometry.coordinates).toEqual([-360, 0])
    })

    it('should preserve other properties on copied features', () => {
      const originalCollection: FeatureCollection<Point> = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] },
            properties: {
              name: 'Test',
              population: 1000000,
              capital: true,
            },
          },
        ],
      }

      const wrapped = createWorldWrappedCollection(originalCollection)

      // East copy should preserve all properties
      expect(wrapped.features[1]?.properties?.name).toBe('Test')
      expect(wrapped.features[1]?.properties?.population).toBe(1000000)
      expect(wrapped.features[1]?.properties?.capital).toBe(true)
      expect(wrapped.features[1]?.properties?.isEastCopy).toBe(true)

      // West copy should preserve all properties
      expect(wrapped.features[2]?.properties?.name).toBe('Test')
      expect(wrapped.features[2]?.properties?.population).toBe(1000000)
      expect(wrapped.features[2]?.properties?.capital).toBe(true)
      expect(wrapped.features[2]?.properties?.isWestCopy).toBe(true)
    })

    it('should handle empty FeatureCollection', () => {
      const emptyCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
      }

      const wrapped = createWorldWrappedCollection(emptyCollection)

      expect(wrapped.features).toHaveLength(0)
    })
  })
})
