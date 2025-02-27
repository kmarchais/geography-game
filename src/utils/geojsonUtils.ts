import type { Feature, FeatureCollection } from "geojson";
import L from "leaflet";

// Define a more specific type for properties
interface GeoJSONProperties {
  name: string;
  code?: string;
  // Add other specific properties if needed
}

export interface GeoJSONFeature extends Feature {
  properties: GeoJSONProperties;
}

export interface GeoJSONLayer extends L.Layer {
  feature: GeoJSONFeature;
}

// Type guard for FeatureCollection
export function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "FeatureCollection" &&
    "features" in value &&
    Array.isArray((value as FeatureCollection).features)
  );
}

// Common styles
export const defaultStyle = {
  fillColor: "var(--map-default-fill)",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};

export const firstAttemptStyle = {
  fillColor: "#2ecc71",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};

export const secondAttemptStyle = {
  fillColor: "#FFFF00",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};

export const thirdAttemptStyle = {
  fillColor: "#FFA500",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};

export const failedStyle = {
  fillColor: "#FF0000",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};

export const selectedStyle = {
  fillOpacity: 0.7,
  weight: 2,
  opacity: 1,
};

// Function to get style based on attempts
export function getStyleForAttempts(attempts: number | undefined) {
  switch (attempts) {
    case 1:
      return firstAttemptStyle;
    case 2:
      return secondAttemptStyle;
    case 3:
      return thirdAttemptStyle;
    default:
      return failedStyle;
  }
} 