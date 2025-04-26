<template>
  <MapGame
    entity-name-singular="Province"
    entity-name-plural="Provinces"
    geojson-url="https://simplemaps.com/static/svg/country/be/admin2/be.json"
    geojson-name-property="name"
    :map-options="mapOptions"
  />
</template>

<script setup lang="ts">
import L from "leaflet";
import MapGame from "../MapGame.vue";

const mapOptions = {
  initialCenter: [50.5, 4.5] as L.LatLngExpression,
  initialZoom: 8,
  minZoom: 7,
  maxZoom: 10,
  worldCopyJump: false,
  maxBounds: [
    [49.5, 2.5],
    [51.5, 6.5],
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};
</script>
