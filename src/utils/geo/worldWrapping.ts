import type { FeatureCollection, Feature, Geometry, GeoJsonProperties } from 'geojson'
import { shiftFeatureCoordinates } from './coordinateTransforms'

export interface WorldWrappingOptions {
  /**
   * Whether to mark copied features with isEastCopy/isWestCopy properties
   * @default true
   */
  markCopies?: boolean
}

/**
 * Creates a world-wrapped GeoJSON FeatureCollection by duplicating features
 * at -360° and +360° longitude offsets for seamless horizontal panning.
 *
 * This is useful for world maps where users can pan infinitely left or right.
 *
 * @param data The original FeatureCollection
 * @param options Configuration options
 * @returns A new FeatureCollection with original features plus east/west copies
 */
export function createWorldWrappedCollection<
  T extends Geometry = Geometry,
  P extends GeoJsonProperties = GeoJsonProperties
>(
  data: FeatureCollection<T, P>,
  options: WorldWrappingOptions = {}
): FeatureCollection<T, P> {
  const { markCopies = true } = options

  const wrappedCollection = structuredClone(data)
  const originalFeatures = data.features

  // Create east copies (shifted +360° longitude)
  const eastFeatures = originalFeatures.map((feature) => {
    const clone = shiftFeatureCoordinates(feature, 360) as Feature<T, P>
    if (markCopies && clone.properties) {
      ;(clone.properties as any).isEastCopy = true
    }
    return clone
  })

  // Create west copies (shifted -360° longitude)
  const westFeatures = originalFeatures.map((feature) => {
    const clone = shiftFeatureCoordinates(feature, -360) as Feature<T, P>
    if (markCopies && clone.properties) {
      ;(clone.properties as any).isWestCopy = true
    }
    return clone
  })

  // Combine: original + east + west
  wrappedCollection.features = [...originalFeatures, ...eastFeatures, ...westFeatures]

  return wrappedCollection
}

/**
 * Legacy function for backward compatibility with Vue components
 * Uses shiftCoordinatesLegacy for in-place mutation
 */
export function createWorldWrappedCollectionLegacy<T extends Geometry = Geometry, P = any>(
  data: FeatureCollection<T, P>,
  shiftCoordinatesFn: (feature: any, offset: number) => any
): FeatureCollection<T, P> {
  const wrappedCollection = structuredClone(data)
  const originalFeatures = data.features

  const eastFeatures = originalFeatures.map((feature) => {
    const clone = structuredClone(feature)
    if (!clone.properties) clone.properties = { name: '' } as P
    ;(clone.properties as any).isEastCopy = true
    shiftCoordinatesFn(clone, 360)
    return clone
  })

  const westFeatures = originalFeatures.map((feature) => {
    const clone = structuredClone(feature)
    if (!clone.properties) clone.properties = { name: '' } as P
    ;(clone.properties as any).isWestCopy = true
    shiftCoordinatesFn(clone, -360)
    return clone
  })

  wrappedCollection.features = [...originalFeatures, ...eastFeatures, ...westFeatures]

  return wrappedCollection
}
