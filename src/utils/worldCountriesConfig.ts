import type { GameConfig } from "../types/game";
import type { FeatureCollection, Feature, Geometry, GeoJsonObject } from "geojson";

interface GeoJSONProperties {
  name: string;
  [key: string]: unknown;
}
type GeoJSONFeatureCollection = FeatureCollection<Geometry, GeoJSONProperties>;
type GeoJSONFeature = Feature<Geometry, GeoJSONProperties>;

// World Countries Configuration
export const worldCountriesConfig: GameConfig = {
  name: "World Countries",
  dataUrl: "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson",
  mapCenter: [20, 0],
  zoom: 2,
  maxBounds: [
    [-90, -540],
    [90, 540],
  ],
  propertyName: "name",
  targetLabel: "Country",

  // For world map, create wrapped duplicates for better user experience
  processData: (data: GeoJsonObject): GeoJsonObject => {
    // First check if data is a FeatureCollection
    if (!isFeatureCollection(data)) {
      return data; // Return as is if not a FeatureCollection
    }

    const featureCollection = data as GeoJSONFeatureCollection;

    // Create shifted versions of the world for continuous scrolling
    const leftWorldData = createShiftedGeoJSON(featureCollection, -360);
    const rightWorldData = createShiftedGeoJSON(featureCollection, 360);

    return {
      type: "FeatureCollection",
      features: [
        ...leftWorldData.features,
        ...featureCollection.features,
        ...rightWorldData.features,
      ],
    } as GeoJsonObject;
  }
};

/**
 * Type guard to check if the object is a FeatureCollection
 */
function isFeatureCollection(obj: unknown): obj is GeoJSONFeatureCollection {
  return (
    obj != null &&
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    (obj as Record<string, unknown>).type === 'FeatureCollection' &&
    'features' in obj &&
    Array.isArray((obj as Record<string, unknown>).features)
  );
}

/**
 * Helper function to create a shifted version of GeoJSON data for world wrapping
 * @param originalData The original GeoJSON data
 * @param longitudeShift The amount to shift longitude coordinates
 * @returns A new GeoJSON collection with shifted coordinates
 */
function createShiftedGeoJSON(
  originalData: GeoJSONFeatureCollection,
  longitudeShift: number
): GeoJSONFeatureCollection {
  const shiftedData = JSON.parse(JSON.stringify(originalData)) as GeoJSONFeatureCollection;

  shiftedData.features.forEach((feature: GeoJSONFeature) => {
    if (feature.geometry.type === "Polygon") {
      const polygonGeometry = feature.geometry as GeoJSON.Polygon;
      polygonGeometry.coordinates.forEach((ring) => {
        ring.forEach((coord) => {
          coord[0] += longitudeShift;
        });
      });
    } else if (feature.geometry.type === "MultiPolygon") {
      const multiPolygonGeometry = feature.geometry as GeoJSON.MultiPolygon;
      multiPolygonGeometry.coordinates.forEach((polygon) => {
        polygon.forEach((ring) => {
          ring.forEach((coord) => {
            coord[0] += longitudeShift;
          });
        });
      });
    }
  });

  return shiftedData;
}
