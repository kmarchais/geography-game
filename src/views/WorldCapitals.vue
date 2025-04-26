<template>
  <div class="world-capitals-page">
    <CapitalGame
      :map-options="mapOptions"
      :total-rounds-override="undefined"
    />
  </div>
</template>

<script setup lang="ts">
  import CapitalGame from '../components/CapitalGame.vue';
  import L from 'leaflet';

  const mapOptions = {
    initialCenter: [20, 0] as L.LatLngExpression,
    initialZoom: 2,
    minZoom: 2,
    maxZoom: 8,
    worldCopyJump: true,
    maxBounds: [
      [-90, -540],
      [90, 540],
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0
  };
</script>

<style scoped>
  .world-capitals-page {
    width: 100%;
    height: calc(100vh - 64px); /* Account for app bar */
    position: relative;
    overflow: hidden;
  }
</style>
