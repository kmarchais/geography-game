import { describe, it, expect } from 'vitest'
import {
  isFeatureCollection,
  getStyleForAttempts,
  computeScaleFactor,
  defaultStyle,
  correctStyle1,
  correctStyle2,
  correctStyle3,
  failedStyle,
} from './geojsonUtils'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeoJSONProperties } from './geojsonUtils'

describe('geojsonUtils', () => {
  describe('isFeatureCollection', () => {
    it('should return true for valid FeatureCollection', () => {
      const validFeatureCollection: FeatureCollection<Geometry, GeoJSONProperties> = {
        type: 'FeatureCollection',
        features: [],
      }
      expect(isFeatureCollection(validFeatureCollection)).toBe(true)
    })

    it('should return false for null or undefined', () => {
      expect(isFeatureCollection(null)).toBe(false)
      expect(isFeatureCollection(undefined)).toBe(false)
    })

    it('should return false for non-object values', () => {
      expect(isFeatureCollection('string')).toBe(false)
      expect(isFeatureCollection(123)).toBe(false)
      expect(isFeatureCollection(true)).toBe(false)
    })

    it('should return false for objects without correct type', () => {
      expect(isFeatureCollection({ type: 'Feature' })).toBe(false)
      expect(isFeatureCollection({ features: [] })).toBe(false)
    })

    it('should return false when features is not an array', () => {
      expect(isFeatureCollection({ type: 'FeatureCollection', features: null })).toBe(false)
      expect(isFeatureCollection({ type: 'FeatureCollection', features: {} })).toBe(false)
    })
  })

  describe('getStyleForAttempts', () => {
    it('should return correctStyle1 for 1 attempt', () => {
      expect(getStyleForAttempts(1)).toBe(correctStyle1)
    })

    it('should return correctStyle2 for 2 attempts', () => {
      expect(getStyleForAttempts(2)).toBe(correctStyle2)
    })

    it('should return correctStyle3 for 3 attempts', () => {
      expect(getStyleForAttempts(3)).toBe(correctStyle3)
    })

    it('should return failedStyle for 4 attempts', () => {
      expect(getStyleForAttempts(4)).toBe(failedStyle)
    })

    it('should return defaultStyle for undefined attempts', () => {
      expect(getStyleForAttempts(undefined)).toBe(defaultStyle)
    })

    it('should return defaultStyle for 0 attempts', () => {
      expect(getStyleForAttempts(0)).toBe(defaultStyle)
    })

    it('should return failedStyle for attempt 5 (skipped)', () => {
      expect(getStyleForAttempts(5)).toBe(failedStyle)
    })

    it('should return defaultStyle for attempts > 5', () => {
      expect(getStyleForAttempts(6)).toBe(defaultStyle)
    })
  })

  describe('computeScaleFactor', () => {
    it('should return 1.2 for minDim of 0', () => {
      const bbox = { width: 0, height: 0 } as SVGRect
      expect(computeScaleFactor(bbox)).toBe(1.2)
    })

    it('should return scaled value for minDim < 50', () => {
      const bbox = { width: 25, height: 30 } as SVGRect
      const result = computeScaleFactor(bbox)
      expect(result).toBeLessThanOrEqual(10)
      expect(result).toBeGreaterThan(1.2)
    })

    it('should cap at 10 for very small dimensions', () => {
      const bbox = { width: 1, height: 1 } as SVGRect
      const result = computeScaleFactor(bbox)
      expect(result).toBe(10)
    })

    it('should return 1.5 for minDim between 50 and 150', () => {
      const bbox = { width: 100, height: 120 } as SVGRect
      expect(computeScaleFactor(bbox)).toBe(1.5)
    })

    it('should return 1.2 for minDim >= 150', () => {
      const bbox = { width: 200, height: 250 } as SVGRect
      expect(computeScaleFactor(bbox)).toBe(1.2)
    })

    it('should use minimum dimension for calculation', () => {
      const bbox1 = { width: 40, height: 200 } as SVGRect
      const bbox2 = { width: 200, height: 40 } as SVGRect
      const result1 = computeScaleFactor(bbox1)
      const result2 = computeScaleFactor(bbox2)
      expect(result1).toBe(result2)
    })
  })
})
