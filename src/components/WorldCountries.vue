<!-- WorldCountries.vue -->
<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="processWorldData"
    :total-rounds-override="54"
  />
</template>

<script setup lang="ts">
import MapGame from '../components/MapGame.vue';
import L from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONProperties } from '../utils/geojsonUtils';

// Define map options
const mapOptions = {
  initialCenter: [20, 0] as L.LatLngExpression,
  initialZoom: 2,
  minZoom: 2,
  maxZoom: 8,
  worldCopyJump: true,
  maxBounds: [
    [-90, -540], // Southwest corner
    [90, 540], // Northeast corner
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0
};

// If you need to use a variable totalRounds, define it:
// const totalRounds = 54;

// Function to process world map data with wrapping
const processWorldData = (data: FeatureCollection<Geometry, GeoJSONProperties>) => {
  return createWorldWrapping(data);
};

// Helper function to create wrapped world copies for continuous scrolling
function createWorldWrapping(featureCollection: FeatureCollection<Geometry, GeoJSONProperties>) {
  // Implementation details...
  // This would contain your coordinate shifting logic for world wrapping

  return featureCollection; // This is a placeholder; your actual implementation would return the processed data
}
</script>
