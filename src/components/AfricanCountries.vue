<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojsonData-fn="filterAfricaData"
    :total-rounds-override="54"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection } from "geojson";
import L from "leaflet";
import MapGame from "./MapGame.vue"; // Adjust path
import type { GeoJSONFeature, GeoJSONProperties } from "../utils/geojsonUtils"; // Adjust path

const mapOptions = {
  initialCenter: [5, 20] as L.LatLngExpression, // Center on Africa
  initialZoom: 3,
  minZoom: 2,
  maxZoom: 12,
  worldCopyJump: false, // No wrap needed for regional map
  maxBounds: [
    [-40, -30], // Southwest corner
    [40, 60], // Northeast corner
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

// Predefined list of African countries for fallback filtering
const africanCountriesList = [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
    "Congo", "Congo, DRC", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
    "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau",
    "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi",
    "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger",
    "Nigeria", "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles",
    "Sierra Leone", "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania",
    "Togo", "Tunisia", "Uganda", "Zambia", "Zimbabwe", "Western Sahara",
];

// Processing function to filter only African countries
const filterAfricaData = (
  data: FeatureCollection<any, GeoJSONProperties>
): FeatureCollection<any, GeoJSONProperties> => {

  let filteredFeatures = data.features.filter((feature) => {
    // Primary filter: Check for continent property
    return feature.properties?.continent === "Africa";
  });

  // Fallback filter: If no features found using 'continent', use the predefined list
  if (filteredFeatures.length === 0) {
    console.warn("Filtering African countries by name list as 'continent' property might be missing or didn't match.");
    filteredFeatures = data.features.filter((feature) => {
        // Use the standardized 'name' property added during initial processing
        return africanCountriesList.includes(feature.properties?.name);
    });
  }

  if (filteredFeatures.length === 0) {
      console.error("Could not filter any African countries. Check GeoJSON source and properties.");
  }

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
};
</script>
