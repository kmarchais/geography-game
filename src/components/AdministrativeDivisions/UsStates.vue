<template>
  <MapGame
    entity-name-singular="State"
    entity-name-plural="States"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces_shp.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterUSStates"
    :total-rounds-override="52"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const mapOptions = {
  initialCenter: [39.8283, -98.5795] as L.LatLngExpression,
  initialZoom: 4,
  minZoom: 3,
  maxZoom: 10,
  worldCopyJump: false,
  maxBounds: [
    [18, -130],
    [50, -65],
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const filterUSStates = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {
  const filteredFeatures = data.features.filter((feature) => {
    return feature.properties?.iso_a2 === 'US' || feature.properties?.admin === 'United States of America';
  });

   if (filteredFeatures.length === 0) {
      console.warn("Could not filter US states based on properties, using all features from source.");
      return data;
   }

  return {
    type: "FeatureCollection",
    features: filteredFeatures,
  };
};
</script>
