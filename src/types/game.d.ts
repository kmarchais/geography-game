import L from "leaflet";
import type { GeoJsonObject, Feature, GeoJsonProperties } from "geojson";

export interface GameConfig {
  /**
   * Name of the game (e.g., "US States")
   */
  name: string;

  /**
   * URL to fetch the GeoJSON data
   */
  dataUrl: string;

  /**
   * Initial map center coordinates [latitude, longitude]
   */
  mapCenter: [number, number];

  /**
   * Initial zoom level
   */
  zoom: number;

  /**
   * Map boundaries [[southWest], [northEast]]
   */
  maxBounds?: [[number, number], [number, number]];

  /**
   * Optional filter function for the GeoJSON features
   */
  filterFunction?: (feature: Feature) => boolean;

  /**
   * Property name to use for entity names (typically "name")
   */
  propertyName: string;

  /**
   * Label for what to find (e.g., "State", "Country", "Department")
   */
  targetLabel: string;

  /**
   * Maximum number of rounds (defaults to all available entities)
   */
  maxRounds?: number;

  /**
   * Optional fallback list of entity names if filtering returns no results
   */
  fallbackList?: string[];

  /**
   * Optional function to map properties to the entity name
   */
  nameMapping?: (properties: GeoJsonProperties) => string;

  /**
   * Optional function to process the GeoJSON data after fetching
   */
  processData?: (data: GeoJsonObject) => GeoJsonObject;

  /**
   * Optional function to add custom controls to the map
   */
  customControls?: (map: L.Map) => void;

  /**
   * Optional function called after map and layers are initialized
   */
  postInitialization?: (map: L.Map, layer: L.GeoJSON) => void;
}
