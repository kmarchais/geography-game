<template>
  <MapGame
    entity-name-singular="Federal Subject"
    entity-name-plural="Federal Subjects"
    geojson-url="https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/russia.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

  <script setup lang="ts">
  import L from "leaflet";
  import MapGame from "../MapGame.vue";

  const mapOptions = {
    initialCenter: [60.0, 100.0] as L.LatLngExpression,
    initialZoom: 3,
    minZoom: 2,
    maxZoom: 6,
    worldCopyJump: false,
    maxBounds: [
      [41.0, 19.0],
      [82.0, 180.0],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };
  </script>
