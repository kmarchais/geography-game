<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterSouthAmericaData"
  />
</template>

  <script setup lang="ts">
    import type { FeatureCollection, Geometry } from "geojson";
    import L from "leaflet";
    import MapGame from "./MapGame.vue";
    import type { GeoJSONProperties } from "../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [-20, -60] as L.LatLngExpression,
      initialZoom: 3,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: false,
      maxBounds: [
        [-60, -100],
        [15, -30],
      ] as L.LatLngBoundsExpression,
      maxBoundsViscosity: 1.0,
    };

    const southAmericanCountriesList = [
      "Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador",
      "Guyana", "Paraguay", "Peru", "Suriname", "Uruguay", "Venezuela",
      "French Guiana" // Technically an overseas department of France but included for geographic completeness
    ];

    const filterSouthAmericaData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {

      let filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "South America";
      });

      if (filteredFeatures.length === 0) {
        console.warn("Filtering South American countries by name list as 'continent' property might be missing or didn't match.");
        filteredFeatures = data.features.filter((feature) => {
            return southAmericanCountriesList.includes(feature.properties?.name);
        });
      }

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any South American countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
