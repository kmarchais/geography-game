<template>
  <MapGame
    entity-name-singular="Region"
    entity-name-plural="Regions"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data//italy-regions.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [42.5, 12.5] as L.LatLngExpression,
    initialZoom: 6,
    minZoom: 5,
    maxZoom: 9,
    worldCopyJump: false,
    maxBounds: [
      [36.0, 6.0],
      [48.0, 19.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
