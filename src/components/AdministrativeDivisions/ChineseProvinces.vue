<template>
  <MapGame
    entity-name-singular="Province"
    entity-name-plural="Provinces"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/china.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [35.0, 105.0] as L.LatLngExpression,
    initialZoom: 4,
    minZoom: 3,
    maxZoom: 7,
    worldCopyJump: false,
    maxBounds: [
      [18.0, 73.0],
      [54.0, 135.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
