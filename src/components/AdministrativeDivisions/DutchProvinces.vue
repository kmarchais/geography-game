<template>
  <MapGame
    entity-name-singular="Province"
    entity-name-plural="Provinces"
    geojson-url="https://raw.githubusercontent.com/codeforgermany/click_that_hood/refs/heads/main/public/data/the-netherlands.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [52.2, 5.3] as L.LatLngExpression,
    initialZoom: 7,
    minZoom: 6,
    maxZoom: 9,
    worldCopyJump: false,
    maxBounds: [
      [50.7, 3.0],
      [53.7, 7.6],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
