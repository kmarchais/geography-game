import L from "leaflet";
import type { GameConfig } from "../types/game.d.ts";

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
  processData: (data: any) => {
    const featureCollection = data;
    if (!featureCollection.features) return data;
    
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
    };
  }
};

/**
 * Helper function to create a shifted version of GeoJSON data for world wrapping
 */
function createShiftedGeoJSON(originalData: any, longitudeShift: number): any {
  const shiftedData = JSON.parse(JSON.stringify(originalData));
  
  shiftedData.features.forEach((feature: any) => {
    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates.forEach((ring: number[][]) => {
        ring.forEach((coord: number[]) => {
          coord[0] += longitudeShift;
        });
      });
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          ring.forEach((coord: number[]) => {
            coord[0] += longitudeShift;
          });
        });
      });
    }
  });
  
  return shiftedData;
}