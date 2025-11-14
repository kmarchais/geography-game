import { describe, it, expect } from 'vitest'
import type { Feature, Geometry, Point, LineString, Polygon, MultiPoint, MultiLineString, MultiPolygon } from 'geojson'
import {
  shiftCoordinate,
  shiftCoordinates,
  shiftGeometryCoordinates,
  shiftFeatureCoordinates,
} from './coordinateTransforms'

describe('coordinateTransforms', () => {
  describe('shiftCoordinate', () => {
    it('should shift a 2D coordinate by the specified offset', () => {
      const coord = [10, 20] as [number, number]
      const result = shiftCoordinate(coord, 5)
      expect(result).toEqual([15, 20])
    })

    it('should shift a 3D coordinate and preserve Z value', () => {
      const coord = [10, 20, 100] as [number, number, number]
      const result = shiftCoordinate(coord, 5)
      expect(result).toEqual([15, 20, 100])
    })

    it('should throw error for invalid coordinate', () => {
      const coord = [10] as unknown as [number, number]
      expect(() => shiftCoordinate(coord, 5)).toThrow('Invalid coordinate')
    })

    it('should handle negative offsets', () => {
      const coord = [10, 20] as [number, number]
      const result = shiftCoordinate(coord, -15)
      expect(result).toEqual([-5, 20])
    })
  })

  describe('shiftCoordinates', () => {
    it('should shift an array of coordinates', () => {
      const coords: [number, number][] = [
        [0, 0],
        [10, 10],
        [20, 20],
      ]
      const result = shiftCoordinates(coords, 100)
      expect(result).toEqual([
        [100, 0],
        [110, 10],
        [120, 20],
      ])
    })

    it('should handle empty array', () => {
      const result = shiftCoordinates([], 5)
      expect(result).toEqual([])
    })
  })

  describe('shiftGeometryCoordinates', () => {
    it('should shift Point geometry', () => {
      const geometry: Point = {
        type: 'Point',
        coordinates: [10, 20],
      }
      shiftGeometryCoordinates(geometry, 5)
      expect(geometry.coordinates).toEqual([15, 20])
    })

    it('should shift LineString geometry', () => {
      const geometry: LineString = {
        type: 'LineString',
        coordinates: [
          [0, 0],
          [10, 10],
        ],
      }
      shiftGeometryCoordinates(geometry, 100)
      expect(geometry.coordinates).toEqual([
        [100, 0],
        [110, 10],
      ])
    })

    it('should shift Polygon geometry', () => {
      const geometry: Polygon = {
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
      }
      shiftGeometryCoordinates(geometry, 50)
      expect(geometry.coordinates).toEqual([
        [
          [50, 0],
          [60, 0],
          [60, 10],
          [50, 10],
          [50, 0],
        ],
      ])
    })

    it('should shift MultiPoint geometry', () => {
      const geometry: MultiPoint = {
        type: 'MultiPoint',
        coordinates: [
          [0, 0],
          [10, 10],
        ],
      }
      shiftGeometryCoordinates(geometry, 5)
      expect(geometry.coordinates).toEqual([
        [5, 0],
        [15, 10],
      ])
    })

    it('should shift MultiLineString geometry', () => {
      const geometry: MultiLineString = {
        type: 'MultiLineString',
        coordinates: [
          [
            [0, 0],
            [10, 10],
          ],
          [
            [20, 20],
            [30, 30],
          ],
        ],
      }
      shiftGeometryCoordinates(geometry, 100)
      expect(geometry.coordinates).toEqual([
        [
          [100, 0],
          [110, 10],
        ],
        [
          [120, 20],
          [130, 30],
        ],
      ])
    })

    it('should shift MultiPolygon geometry', () => {
      const geometry: MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 0],
            ],
          ],
          [
            [
              [20, 20],
              [30, 20],
              [30, 30],
              [20, 20],
            ],
          ],
        ],
      }
      shiftGeometryCoordinates(geometry, -10)
      expect(geometry.coordinates).toEqual([
        [
          [
            [-10, 0],
            [0, 0],
            [0, 10],
            [-10, 0],
          ],
        ],
        [
          [
            [10, 20],
            [20, 20],
            [20, 30],
            [10, 20],
          ],
        ],
      ])
    })
  })

  describe('shiftFeatureCoordinates', () => {
    it('should return a new feature without mutating the original', () => {
      const feature: Feature<Point> = {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [10, 20],
        },
        properties: { name: 'Test Point' },
      }

      const shifted = shiftFeatureCoordinates(feature, 5)

      // Original should be unchanged
      expect(feature.geometry.coordinates).toEqual([10, 20])
      // New feature should be shifted
      expect(shifted.geometry?.coordinates).toEqual([15, 20])
      // Properties should be preserved
      expect(shifted.properties).toEqual({ name: 'Test Point' })
    })

    it('should handle feature without geometry', () => {
      const feature: Feature<Geometry> = {
        type: 'Feature',
        geometry: null as any,
        properties: { name: 'Test' },
      }

      const shifted = shiftFeatureCoordinates(feature, 5)
      expect(shifted.geometry).toBeNull()
      expect(shifted.properties).toEqual({ name: 'Test' })
    })

    it('should shift Polygon feature correctly', () => {
      const feature: Feature<Polygon> = {
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
        properties: {},
      }

      const shifted = shiftFeatureCoordinates(feature, 360)
      expect(shifted.geometry.coordinates).toEqual([
        [
          [360, 0],
          [370, 0],
          [370, 10],
          [360, 10],
          [360, 0],
        ],
      ])
    })
  })
})
