/**
 * Registry for manual marker functions
 *
 * Some games require manual placement of markers for entities that don't have
 * polygons in the GeoJSON data (e.g., small islands, overseas territories).
 */

import type { Ref } from 'vue'
import type L from 'leaflet'
import { addFrenchTerritoryMarkers } from './frenchTerritories'

/**
 * Type definition for marker functions
 */
export type AddManualMarkersFunc = (
  map: L.Map,
  available: Ref<string[]>,
  found: Ref<Map<string, number>>,
  clickHandler: (name: string, latlng: L.LatLng) => void
) => void

/**
 * Registry of available marker functions
 * Keys match the markerFunction field in game configs
 */
const markerFunctions: Record<string, AddManualMarkersFunc> = {
  frenchTerritories: addFrenchTerritoryMarkers,
}

/**
 * Get a marker function by name
 * @param name The name of the marker function
 * @returns The marker function or undefined if not found
 */
export function getMarkerFunction(name: string): AddManualMarkersFunc | undefined {
  return markerFunctions[name]
}

/**
 * Get all registered marker function names
 */
export function getMarkerFunctionNames(): string[] {
  return Object.keys(markerFunctions)
}
