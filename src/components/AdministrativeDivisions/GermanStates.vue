<template>
  <MapGame
    entity-name-singular="State"
    entity-name-plural="States"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/germany.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [51.0, 10.5] as L.LatLngExpression,
    initialZoom: 6,
    minZoom: 5,
    maxZoom: 9,
    worldCopyJump: false,
    maxBounds: [
      [47.0, 5.0],
      [55.0, 16.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
