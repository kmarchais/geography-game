<template>
  <MapGame
    entity-name-singular="Community"
    entity-name-plural="Communities"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/spain-communities.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [40.0, -4.0] as L.LatLngExpression,
    initialZoom: 6,
    minZoom: 5,
    maxZoom: 9,
    worldCopyJump: false,
    maxBounds: [
      [35.0, -10.0],
      [45.0, 5.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
