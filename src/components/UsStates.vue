<template>
  <MapGame
    entity-name-singular="State"
    entity-name-plural="States"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces_shp.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojsonData-fn="filterUSStates"
    :total-rounds-override="52"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection } from "geojson";
import L from "leaflet";
import MapGame from "./MapGame.vue"; // Adjust path
import type { GeoJSONProperties } from "../utils/geojsonUtils"; // Adjust path

const mapOptions = {
  initialCenter: [39.8283, -98.5795] as L.LatLngExpression, // Approx center of contiguous US
  initialZoom: 4,
  minZoom: 3,
  maxZoom: 10,
  worldCopyJump: false,
  maxBounds: [
    [18, -130], // Expanded slightly SW
    [50, -65],  // Expanded slightly NE
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

// Processing function to filter only US states (if GeoJSON contains others)
const filterUSStates = (
  data: FeatureCollection<any, GeoJSONProperties>
): FeatureCollection<any, GeoJSONProperties> => {
  const filteredFeatures = data.features.filter((feature) => {
    // Adjust this filter based on the actual properties in the GeoJSON
    // Example: Filter by 'admin' or 'adm0_a3' if available
    return feature.properties?.iso_a2 === 'US' || feature.properties?.admin === 'United States of America';
  });

   if (filteredFeatures.length === 0) {
      console.warn("Could not filter US states based on properties, using all features from source.");
      return data; // Return original data if filtering fails
   }

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
};
</script>
