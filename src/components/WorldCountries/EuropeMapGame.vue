<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterEuropeData"
  />
</template>

  <script setup lang="ts">
    import type { FeatureCollection, Geometry } from "geojson";
    import L from "leaflet";
    import MapGame from "../MapGame.vue";
    import type { GeoJSONProperties } from "../../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [55, 15] as L.LatLngExpression,
      initialZoom: 4,
      minZoom: 3,
      maxZoom: 12,
      worldCopyJump: false,
      maxBounds: [
        [35, -25],
        [75, 50],
      ] as L.LatLngBoundsExpression,
      maxBoundsViscosity: 1.0,
    };

    const europeanCountriesList = [
      "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina",
      "Bulgaria", "Croatia", "Czech Republic", "Denmark", "Estonia", "Finland",
      "France", "Germany", "Greece", "Hungary", "Iceland", "Ireland", "Italy",
      "Kosovo", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "Malta",
      "Moldova", "Monaco", "Montenegro", "Netherlands", "North Macedonia", "Norway",
      "Poland", "Portugal", "Romania", "Russia", "San Marino", "Serbia", "Slovakia",
      "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine", "United Kingdom",
      "Vatican City"
    ];

    const filterEuropeData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {

      let filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "Europe";
      });

      if (filteredFeatures.length === 0) {
        console.warn("Filtering European countries by name list as 'continent' property might be missing or didn't match.");
        filteredFeatures = data.features.filter((feature) => {
            return europeanCountriesList.includes(feature.properties?.name);
        });
      }

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any European countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
