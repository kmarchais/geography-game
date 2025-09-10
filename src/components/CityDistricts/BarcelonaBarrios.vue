<template>
  <MapGame
    entity-name-singular="Barrio"
    entity-name-plural="Barrios"
    :geojson-url="config.dataUrl"
    :geojson-name-property="config.propertyName"
    :map-options="mapOptions"
    :process-geojson-data-fn="processBarcelonaBarriosData"
  />
</template>

<script setup lang="ts">
import type { FeatureCollection, Geometry, Feature } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import { barcelonaBarriosConfig } from "../../utils/cityDistrictsConfig";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const config = barcelonaBarriosConfig;

const mapOptions = {
  initialCenter: config.mapCenter as L.LatLngExpression,
  initialZoom: config.zoom,
  minZoom: 10,
  maxZoom: 16,
  worldCopyJump: false,
  maxBounds: config.maxBounds as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const processBarcelonaBarriosData = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {

  const processedFeatures = data.features.map((feature: Feature<Geometry, GeoJSONProperties>) => {
    if (!feature.properties) feature.properties = { name: "Unknown" };

    // Use the barrio name directly from NOM property
    feature.properties.name = (feature.properties as GeoJSONProperties)[config.propertyName] as string || "Unknown";

    return feature;
  });

  console.log(`Loaded ${processedFeatures.length} Barcelona barrios`);

  return {
    type: "FeatureCollection",
    features: processedFeatures,
  };
};
</script>
