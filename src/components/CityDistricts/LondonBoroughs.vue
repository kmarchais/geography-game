<template>
  <MapGame
    entity-name-singular="Borough"
    entity-name-plural="Boroughs"
    :geojson-url="config.dataUrl"
    :geojson-name-property="config.propertyName"
    :map-options="mapOptions"
    :process-geojson-data-fn="processLondonData"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry, Feature } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import { londonBoroughsConfig } from "../../utils/cityDistrictsConfig";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const config = londonBoroughsConfig;

const mapOptions = {
  initialCenter: config.mapCenter as L.LatLngExpression,
  initialZoom: config.zoom,
  minZoom: 8,
  maxZoom: 15,
  worldCopyJump: false,
  maxBounds: config.maxBounds as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const processLondonData = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {

  const processedFeatures = data.features.map((feature: Feature<Geometry, GeoJSONProperties>) => {
    if (!feature.properties) {feature.properties = { name: "Unknown" };}

    // Map the original name to a more readable format
    if (config.nameMapping && (feature.properties as GeoJSONProperties)[config.propertyName]) {
      feature.properties.name = config.nameMapping(feature.properties as GeoJSONProperties);
    } else {
      feature.properties.name = (feature.properties as GeoJSONProperties)[config.propertyName] as string || "Unknown";
    }

    return feature;
  });

  return {
    type: "FeatureCollection",
    features: processedFeatures,
  };
};
</script>
