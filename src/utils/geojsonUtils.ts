import L from "leaflet";
import type { GeoJSON, Feature, FeatureCollection } from "geojson";

export interface GeoJSONFeature {
  type: string;
  properties: {
    name: string;
    [key: string]: any;
  };
  geometry: {
    type: string;
    coordinates: any[];
  };
}

export interface GeoJSONLayer extends L.Layer {
  feature: GeoJSONFeature;
}

export function isFeatureCollection(data: any): data is FeatureCollection {
  return (
    data &&
    typeof data === "object" &&
    data.type === "FeatureCollection" &&
    Array.isArray(data.features)
  );
}

// Style definitions
export const defaultStyle: L.PathOptions = {
  weight: 1,
  opacity: 1,
  color: "var(--map-border-color)",
  fillOpacity: 0.3,
  fillColor: "var(--map-default-fill)",
};

export const selectedStyle: L.PathOptions = {
  weight: 2,
  color: "#ff7800",
  fillOpacity: 0.5,
  fillColor: "#ff7800",
};

export const failedStyle: L.PathOptions = {
  weight: 2,
  color: "#ff0000",
  fillOpacity: 0.5,
  fillColor: "#ff0000",
};

/**
 * Get style based on number of attempts
 * @param attempts Number of attempts (1-3, or 4 for failed)
 */
export function getStyleForAttempts(attempts: number): L.PathOptions {
  switch (attempts) {
    case 1:
      // First attempt - Green
      return {
        weight: 2,
        color: "#2ecc71",
        fillOpacity: 0.5,
        fillColor: "#2ecc71",
      };
    case 2:
      // Second attempt - Yellow
      return {
        weight: 2,
        color: "#FFFF00",
        fillOpacity: 0.5,
        fillColor: "#FFFF00",
      };
    case 3:
      // Third attempt - Orange
      return {
        weight: 2,
        color: "#FFA500",
        fillOpacity: 0.5,
        fillColor: "#FFA500",
      };
    case 4:
    default:
      // Failed - Red
      return failedStyle;
  }
}