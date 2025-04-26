<template>
  <MapGame
    entity-name-singular="Province/Territory"
    entity-name-plural="Provinces/Territories"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_1_states_provinces_shp.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterCanadianProvinces"
    :total-rounds-override="13"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const mapOptions = {
  // Centered roughly on Canada
  initialCenter: [62, -105] as L.LatLngExpression,
  initialZoom: 3,
  minZoom: 3,
  maxZoom: 10,
  worldCopyJump: false,
  // Bounds covering Canada
  maxBounds: [
    [41, -141], // Southwest corner (approx)
    [84, -52], // Northeast corner (approx)
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

/**
 * Filters the GeoJSON data to include only features representing Canadian provinces and territories.
 * It checks the 'iso_a2' property for 'CA' or the 'admin' property for 'Canada'.
 */
const filterCanadianProvinces = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {
  const filteredFeatures = data.features.filter((feature) => {
    // Check for standard ISO country code or the admin country name
    return (
      feature.properties?.iso_a2 === "CA" ||
      feature.properties?.admin === "Canada"
    );
  });

  if (filteredFeatures.length === 0) {
    console.warn(
      "Could not filter Canadian provinces/territories based on properties, using all features from source."
    );
    // Return original data if filtering fails unexpectedly
    return data;
  }

  // Canada has 10 provinces and 3 territories = 13
  if (filteredFeatures.length !== 13) {
     console.warn(`Expected 13 provinces/territories for Canada, but found ${filteredFeatures.length}. Check GeoJSON source properties.`);
  }


  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
};
</script>
