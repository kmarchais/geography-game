import type { Feature, Geometry, Position } from 'geojson'

/**
 * Shifts a coordinate point by the specified offset
 */
export function shiftCoordinate(coord: Position, offset: number): Position {
  const x = coord[0]
  const y = coord[1]
  if (x === undefined || y === undefined) {
    throw new Error('Invalid coordinate: missing x or y value')
  }
  return [x + offset, y, ...(coord.slice(2) as number[])]
}

/**
 * Shifts an array of coordinates by the specified offset
 */
export function shiftCoordinates(coords: Position[], offset: number): Position[] {
  return coords.map((coord) => shiftCoordinate(coord, offset))
}

/**
 * Shifts a geometry's coordinates by the specified offset
 */
export function shiftGeometryCoordinates(geometry: Geometry, offset: number): void {
  switch (geometry.type) {
    case 'Point':
      geometry.coordinates = shiftCoordinate(geometry.coordinates as Position, offset)
      break

    case 'LineString':
    case 'MultiPoint':
      geometry.coordinates = shiftCoordinates(geometry.coordinates as Position[], offset)
      break

    case 'Polygon':
    case 'MultiLineString':
      geometry.coordinates = (geometry.coordinates as Position[][]).map((ring) =>
        shiftCoordinates(ring, offset)
      )
      break

    case 'MultiPolygon':
      geometry.coordinates = (geometry.coordinates as Position[][][]).map((polygon) =>
        polygon.map((ring) => shiftCoordinates(ring, offset))
      )
      break

    case 'GeometryCollection':
      geometry.geometries.forEach((geom) => shiftGeometryCoordinates(geom, offset))
      break
  }
}

/**
 * Shifts a GeoJSON feature's coordinates by the specified offset
 * Returns a new feature with shifted coordinates (does not mutate the original)
 */
export function shiftFeatureCoordinates<G extends Geometry = Geometry>(
  feature: Feature<G>,
  offset: number
): Feature<G> {
  const clonedFeature = structuredClone(feature)
  if (!clonedFeature.geometry) {
    return clonedFeature
  }
  shiftGeometryCoordinates(clonedFeature.geometry, offset)
  return clonedFeature
}

/**
 * Legacy function for backward compatibility
 * Mutates the feature in place
 * @deprecated Use shiftFeatureCoordinates instead
 */
export function shiftCoordinatesLegacy(feature: any, offset: number): any {
  if (!feature.geometry) return feature

  const shiftPoint = (coords: number[]) => {
    const x = coords[0]
    const y = coords[1]
    if (x === undefined || y === undefined) {
      throw new Error('Invalid coordinates')
    }
    return [x + offset, y]
  }

  switch (feature.geometry.type) {
    case 'Point':
      feature.geometry.coordinates = shiftPoint(feature.geometry.coordinates)
      break
    case 'LineString':
    case 'MultiPoint':
      feature.geometry.coordinates = feature.geometry.coordinates.map(shiftPoint)
      break
    case 'Polygon':
    case 'MultiLineString':
      feature.geometry.coordinates = feature.geometry.coordinates.map((coords: any) =>
        coords.map(shiftPoint)
      )
      break
    case 'MultiPolygon':
      feature.geometry.coordinates = feature.geometry.coordinates.map((polygon: any) =>
        polygon.map((coords: any) => coords.map(shiftPoint))
      )
      break
  }

  return feature
}
