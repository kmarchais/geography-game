<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterAsiaData"
  />
</template>

  <script setup lang="ts">
    import type { FeatureCollection, Geometry } from "geojson";
    import L from "leaflet";
    import MapGame from "../MapGame.vue";
    import type { GeoJSONProperties } from "../../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [35, 90] as L.LatLngExpression,
      initialZoom: 3,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: false,
      maxBoundsViscosity: 1.0,
    };

    const filterAsiaData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {

      const filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "Asia";
      });

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any Asian countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
