<template>
  <MapGame
    entity-name-singular="Quartier"
    entity-name-plural="Quartiers"
    :geojson-url="config.dataUrl"
    :geojson-name-property="config.propertyName"
    :map-options="mapOptions"
    :process-geojson-data-fn="processBordeauxData"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry, Feature } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import { bordeauxQuartiersConfig } from "../../utils/cityDistrictsConfig";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const config = bordeauxQuartiersConfig;

const mapOptions = {
  initialCenter: config.mapCenter as L.LatLngExpression,
  initialZoom: config.zoom,
  minZoom: 10,
  maxZoom: 16,
  worldCopyJump: false,
  maxBounds: config.maxBounds as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const processBordeauxData = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {

  let filteredFeatures = data.features;

  // Apply filter if defined to only show Bordeaux city quartiers
  if (config.filterFunction) {
    filteredFeatures = filteredFeatures.filter(config.filterFunction);
  }

  const processedFeatures = filteredFeatures.map((feature: Feature<Geometry, GeoJSONProperties>) => {
    if (!feature.properties) {feature.properties = { name: "Unknown" };}

    // Use nameMapping if available, otherwise use raw property name
    if (config.nameMapping) {
      feature.properties.name = config.nameMapping(feature.properties as GeoJSONProperties);
    } else {
      feature.properties.name = (feature.properties as GeoJSONProperties)[config.propertyName] as string || "Unknown";
    }

    return feature;
  });

  if (processedFeatures.length === 0) {
    console.error("No quartiers found after filtering Bordeaux data");
  }

  return {
    type: "FeatureCollection",
    features: processedFeatures,
  };
};
</script>
