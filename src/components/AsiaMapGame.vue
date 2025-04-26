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
    import MapGame from "./MapGame.vue";
    import type { GeoJSONProperties } from "../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [35, 90] as L.LatLngExpression,
      initialZoom: 3,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: false,
      maxBounds: [
        [-20, 50],
        [70, 120],
      ] as L.LatLngBoundsExpression,
      maxBoundsViscosity: 1.0,
    };

    const asianCountriesList = [
      "Afghanistan", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Bhutan",
      "Brunei", "Cambodia", "China", "Cyprus", "Georgia", "India", "Indonesia",
      "Iran", "Iraq", "Israel", "Japan", "Jordan", "Kazakhstan", "Kuwait",
      "Kyrgyzstan", "Laos", "Lebanon", "Malaysia", "Maldives", "Mongolia",
      "Myanmar", "Nepal", "North Korea", "Oman", "Pakistan", "Palestine",
      "Philippines", "Qatar", "Saudi Arabia", "Singapore", "South Korea",
      "Sri Lanka", "Syria", "Taiwan", "Tajikistan", "Thailand", "Timor-Leste",
      "Turkey", "Turkmenistan", "United Arab Emirates", "Uzbekistan", "Vietnam",
      "Yemen"
    ];

    const filterAsiaData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {

      let filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "Asia";
      });

      if (filteredFeatures.length === 0) {
        console.warn("Filtering Asian countries by name list as 'continent' property might be missing or didn't match.");
        filteredFeatures = data.features.filter((feature) => {
            return asianCountriesList.includes(feature.properties?.name);
        });
      }

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any Asian countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
