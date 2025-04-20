<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojsonData-fn="processWorldData"
    :total-rounds-override="totalRounds"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection } from "geojson";
import L from "leaflet";
import MapGame from "./MapGame.vue"; // Adjust path if needed
import type { GeoJSONProperties } from "../utils/geojsonUtils"; // Adjust path

const props = defineProps({
  totalRounds: {
    type: Number,
    default: 241, // Default for world countries
  },
});

const mapOptions = {
  initialCenter: [20, 0] as L.LatLngExpression,
  initialZoom: 2,
  minZoom: 2,
  maxZoom: 12,
  worldCopyJump: true, // Enable world wrap
  maxBounds: [
    [-90, -540],
    [90, 540],
  ] as L.LatLngBoundsExpression, // Allow panning across wrapped worlds
  maxBoundsViscosity: 1.0,
};

// Function to create shifted GeoJSON for world wrapping
const createShiftedGeoJSON = (
  originalData: FeatureCollection<any, GeoJSONProperties>,
  longitudeShift: number
): FeatureCollection<any, GeoJSONProperties> => {
  // Deep clone to avoid modifying original data
  const shiftedData: FeatureCollection<any, GeoJSONProperties> = JSON.parse(
    JSON.stringify(originalData)
  );
  shiftedData.features.forEach((feature) => {
    // REMOVED: if (!feature.properties) feature.properties = {};
    // Properties object should exist from prior processing in MapGame.vue

    // Ensure geometry exists before trying to shift coordinates
    const geometry = feature.geometry;
    if (geometry?.type === "Polygon") {
      geometry.coordinates.forEach((ring: number[][]) => {
        ring.forEach((coord: number[]) => {
          // Ensure coord is valid before shifting
          if (coord && typeof coord[0] === 'number') {
              coord[0] += longitudeShift;
          }
        });
      });
    } else if (geometry?.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          ring.forEach((coord: number[]) => {
            // Ensure coord is valid before shifting
            if (coord && typeof coord[0] === 'number') {
                coord[0] += longitudeShift;
            }
          });
        });
      });
    }
  });
  return shiftedData;
};

// Processing function specific to world map
const processWorldData = (
  data: FeatureCollection<any, GeoJSONProperties>
): FeatureCollection<any, GeoJSONProperties> => {
  const leftWorldData = createShiftedGeoJSON(data, -360);
  const rightWorldData = createShiftedGeoJSON(data, 360);
  // Combine original and shifted features
  return {
    type: "FeatureCollection",
    features: [
      ...leftWorldData.features,
      ...data.features, // Original data in the middle
      ...rightWorldData.features,
    ],
  };
};
</script>
