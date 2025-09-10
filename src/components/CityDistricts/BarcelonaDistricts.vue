<template>
  <MapGame
    entity-name-singular="District"
    entity-name-plural="Districts"
    :geojson-url="config.dataUrl"
    :geojson-name-property="config.propertyName"
    :map-options="mapOptions"
    :process-geojson-data-fn="processBarcelonaData"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry, Feature } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import { barcelonaDistrictsConfig } from "../../utils/cityDistrictsConfig";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const config = barcelonaDistrictsConfig;

const mapOptions = {
  initialCenter: config.mapCenter as L.LatLngExpression,
  initialZoom: config.zoom,
  minZoom: 9,
  maxZoom: 15,
  worldCopyJump: false,
  maxBounds: config.maxBounds as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const processBarcelonaData = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {

  const processedFeatures = data.features.map((feature: Feature<Geometry, GeoJSONProperties>) => {
    if (!feature.properties) feature.properties = { name: "Unknown" };

    // Use nameMapping if available, otherwise use raw property name
    if (config.nameMapping) {
      feature.properties.name = config.nameMapping(feature.properties as GeoJSONProperties);
    } else {
      feature.properties.name = (feature.properties as GeoJSONProperties)[config.propertyName] as string || "Unknown";
    }

    return feature;
  });

  console.log(`Loaded ${processedFeatures.length} Barcelona districts`);

  return {
    type: "FeatureCollection",
    features: processedFeatures,
  };
};
</script>
