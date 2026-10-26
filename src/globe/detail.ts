import type { Coordinate, Country } from './geography'

export function rotationSpeed(distance: number): number {
  return .65 * Math.max(.0001, Math.min(1, (distance - 1) / 2.1))
}

export function islandBlend(projectedPixels: number, cameraDistance = Infinity): number {
  const t = Math.max(0, Math.min(1, Math.max((projectedPixels - 8) / 14, (1.015 - cameraDistance) / .013)))
  return t * t * (3 - 2 * t)
}

export function countryAngularSize(country: Country): number {
  return Math.max(0, ...country.polygons.map(polygon => {
    const ring = polygon[0]!
    const width = Math.max(...ring.map(p => p[0])) - Math.min(...ring.map(p => p[0]))
    const height = Math.max(...ring.map(p => p[1])) - Math.min(...ring.map(p => p[1]))
    return Math.max(width * Math.cos(country.center[1] * Math.PI / 180), height) * Math.PI / 180
  }))
}

export interface ImageryTile { key: string; level: number; column: number; row: number; west: number; north: number; span: number; latitudeSpan: number }

// NASA GIBS uses 512px geographic tiles and a 288-degree span at level zero.
export function imageryTiles([longitude, latitude]: Coordinate, distance: number, aspect: number, viewportHeight: number): ImageryTile[] {
  if (distance >= 2 || distance <= 1 || viewportHeight <= 0) {return []}
  const footprint = 2 * Math.atan((distance - 1) * Math.tan(21 * Math.PI / 180)) * 180 / Math.PI
  const lon = ((longitude + 180) % 360 + 360) % 360 - 180
  const halfHeight = footprint * .6
  const halfWidth = Math.abs(latitude) + halfHeight >= 90 ? 180 : Math.min(180, footprint * aspect * .6 / Math.max(.01, Math.cos(latitude * Math.PI / 180)))
  let level = Math.max(2, Math.min(7, Math.ceil(Math.log2(288 / (footprint * 512 / viewportHeight)))))
  let span = 0, columns = 0, firstColumn = 0, lastColumn = 0, firstRow = 0, lastRow = 0
  // Lower resolution until the entire footprint, including the pole, fits.
  for (; level >= 2; level--) {
    span = 288 / 2 ** level
    columns = Math.round(360 / span)
    firstColumn = Math.floor((lon - halfWidth + 180) / span) - 1
    lastColumn = Math.min(firstColumn + columns - 1, Math.floor((lon + halfWidth + 180) / span) + 1)
    firstRow = Math.max(0, Math.floor((90 - latitude - halfHeight) / span) - 1)
    lastRow = Math.min(Math.ceil(180 / span) - 1, Math.floor((90 - latitude + halfHeight) / span) + 1)
    if ((lastColumn - firstColumn + 1) * (lastRow - firstRow + 1) <= 24) {break}
  }
  const tiles: (ImageryTile & { priority: number })[] = []
  const centerColumn = Math.floor((lon + 180) / span), centerRow = Math.floor((90 - latitude) / span)
  for (let row = firstRow; row <= lastRow; row++) {for (let x = firstColumn; x <= lastColumn; x++) {
    const column = ((x % columns) + columns) % columns
    const north = 90 - row * span
    tiles.push({ key: `${level}/${row}/${column}`, level, column, row, west: -180 + column * span, north, span, latitudeSpan: Math.min(span, north + 90), priority: (x - centerColumn) ** 2 + (row - centerRow) ** 2 })
  }}
  return tiles.sort((a, b) => a.priority - b.priority)
}

export function imageryUrl(tile: ImageryTile): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_ShadedRelief_Bathymetry/default/500m/${tile.level}/${tile.row}/${tile.column}.jpeg`
}
