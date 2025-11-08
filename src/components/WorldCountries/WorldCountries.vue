<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :process-geojson-data-fn="processGeojsonData"
    :map-options="mapOptions"
    :total-rounds-override="241"
  />
</template>

<script setup lang="ts">
import MapGame from '../MapGame.vue';
import L from 'leaflet';
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const mapOptions = {
  initialCenter: [20, 0] as L.LatLngExpression,
  initialZoom: 2,
  minZoom: 2,
  maxZoom: 8,
  worldCopyJump: true,
  maxBoundsViscosity: 1.0
};

const processGeojsonData = (data: FeatureCollection<Geometry, GeoJSONProperties>) => {
  const wrappedCollection = structuredClone(data);
  const originalFeatures = data.features;

  const eastFeatures = originalFeatures.map(feature => {
    const clone = structuredClone(feature);
    if (!clone.properties) clone.properties = {name: ""};
    clone.properties.isEastCopy = true;

    shiftCoordinates(clone, 360);
    return clone;
  });

  const westFeatures = originalFeatures.map(feature => {
    const clone = structuredClone(feature);
    if (!clone.properties) clone.properties = {name: ""};
    clone.properties.isWestCopy = true;

    shiftCoordinates(clone, -360);
    return clone;
  });

  wrappedCollection.features = [
    ...originalFeatures,
    ...eastFeatures,
    ...westFeatures
  ];

  return wrappedCollection;
};

function shiftCoordinates(feature: any, offset: number) {
  if (!feature.geometry) return feature;

  const shiftPoint = (coords: number[]) => {
    const x = coords[0];
    const y = coords[1];
    if (x === undefined || y === undefined) {
      throw new Error("Invalid coordinates");
    }
    return [x + offset, y];
  };

  switch (feature.geometry.type) {
    case 'Point':
      feature.geometry.coordinates = shiftPoint(feature.geometry.coordinates);
      break;
    case 'LineString':
    case 'MultiPoint':
      feature.geometry.coordinates = feature.geometry.coordinates.map(shiftPoint);
      break;
    case 'Polygon':
    case 'MultiLineString':
      feature.geometry.coordinates = feature.geometry.coordinates.map((ring: number[][]) =>
        ring.map(shiftPoint)
      );
      break;
    case 'MultiPolygon':
      feature.geometry.coordinates = feature.geometry.coordinates.map((polygon: number[][][]) =>
        polygon.map((ring: number[][]) => ring.map(shiftPoint))
      );
      break;
  }

  return feature;
}
</script>
