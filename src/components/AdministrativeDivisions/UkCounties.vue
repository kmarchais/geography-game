<template>
  <MapGame
    entity-name-singular="Region"
    entity-name-plural="Regions"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/united-kingdom.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [54.5, -3.5] as L.LatLngExpression,
    initialZoom: 5,
    minZoom: 4,
    maxZoom: 8,
    worldCopyJump: false,
    maxBounds: [
      [49.0, -11.0],
      [61.0, 2.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
