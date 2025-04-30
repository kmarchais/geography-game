<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="processWorldData"
    :total-rounds-override="54"
  />
</template>

<script setup lang="ts">
import MapGame from '../MapGame.vue';
import L from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONProperties } from '../../utils/geojsonUtils';

const mapOptions = {
  initialCenter: [20, 0] as L.LatLngExpression,
  initialZoom: 2,
  minZoom: 2,
  maxZoom: 8,
  worldCopyJump: true,
  maxBoundsViscosity: 1.0
};

const processWorldData = (data: FeatureCollection<Geometry, GeoJSONProperties>) => {
  return createWorldWrapping(data);
};

function createWorldWrapping(featureCollection: FeatureCollection<Geometry, GeoJSONProperties>) {
  return featureCollection;
}
</script>
