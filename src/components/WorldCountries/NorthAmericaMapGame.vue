<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterNorthAmericaData"
  />
</template>

  <script setup lang="ts">
    import type { FeatureCollection, Geometry } from "geojson";
    import L from "leaflet";
    import MapGame from "../MapGame.vue";
    import type { GeoJSONProperties } from "../../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [25, -90] as L.LatLngExpression,
      initialZoom: 3,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: false,
      maxBounds: [
        [5, -180],
        [85, -30],
      ] as L.LatLngBoundsExpression,
      maxBoundsViscosity: 1.0,
    };

    const northAmericanCountriesList = [
      // North America
      "Canada", "United States", "Mexico",

      // Central America
      "Belize", "Costa Rica", "El Salvador", "Guatemala", "Honduras", "Nicaragua", "Panama",

      // Caribbean
      "Antigua and Barbuda", "Bahamas", "Barbados", "Cuba", "Dominica",
      "Dominican Republic", "Grenada", "Haiti", "Jamaica", "Saint Kitts and Nevis",
      "Saint Lucia", "Saint Vincent and the Grenadines", "Trinidad and Tobago",

      // Other territories that might be included in the GeoJSON
      "Anguilla", "Aruba", "Bermuda", "British Virgin Islands", "Cayman Islands",
      "Guadeloupe", "Martinique", "Montserrat", "Puerto Rico", "Sint Maarten",
      "Saint Martin", "Turks and Caicos Islands", "United States Virgin Islands",
      "Greenland"
    ];

    const filterNorthAmericaData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {

      let filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "North America";
      });

      if (filteredFeatures.length === 0) {
        console.warn("Filtering North American countries by name list as 'continent' property might be missing or didn't match.");
        filteredFeatures = data.features.filter((feature) => {
            return northAmericanCountriesList.includes(feature.properties?.name);
        });
      }

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any North American countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
