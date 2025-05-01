<template>
  <MapGame
    entity-name-singular="Country"
    entity-name-plural="Countries"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterOceaniaData"
    :total-rounds-override="25"
  />
</template>

  <script setup lang="ts">
    import type { FeatureCollection, Geometry } from "geojson";
    import L from "leaflet";
    import MapGame from "../MapGame.vue";
    import type { GeoJSONProperties } from "../../utils/geojsonUtils";

    const mapOptions = {
      initialCenter: [-15, -160] as L.LatLngExpression, // Centered in Pacific
      initialZoom: 3,
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true, // Enable world copy jump to handle the date line crossing
      maxBoundsViscosity: 1.0,
    };

    const filterOceaniaData = (
      data: FeatureCollection<Geometry, GeoJSONProperties>
    ): FeatureCollection<Geometry, GeoJSONProperties> => {
      // First try filtering by continent property
      let filteredFeatures = data.features.filter((feature) => {
        return feature.properties?.continent === "Oceania";
      });

      // Normalize coordinates to handle the date line issue
      filteredFeatures = filteredFeatures.map(feature => {
        // Create a deep copy of the feature to avoid mutating the original
        const featureCopy = JSON.parse(JSON.stringify(feature));

        // For each coordinate, if it's greater than 0, subtract 360 to make it negative
        // This shifts all coordinates to be consistently on one side of the date line
        if (featureCopy.geometry && (featureCopy.geometry.type === "Polygon" || featureCopy.geometry.type === "MultiPolygon")) {
          const normalizeCoordinates = (coords: any[]): any[] => {
            return coords.map(coord => {
              if (Array.isArray(coord[0])) {
                return normalizeCoordinates(coord);
              } else {
                // If longitude (coord[0]) is > 0, subtract 360 to make it negative
                if (coord[0] > 0) {
                  return [coord[0] - 360, coord[1]];
                }
                return coord;
              }
            });
          };

          if (featureCopy.geometry.type === "Polygon") {
            featureCopy.geometry.coordinates = normalizeCoordinates(featureCopy.geometry.coordinates);
          } else if (featureCopy.geometry.type === "MultiPolygon") {
            featureCopy.geometry.coordinates = normalizeCoordinates(featureCopy.geometry.coordinates);
          }
        }
        return featureCopy;
      });

      if (filteredFeatures.length === 0) {
          console.error("Could not filter any Oceania countries. Check GeoJSON source and properties.");
      }

      return {
        type: "FeatureCollection",
        features: filteredFeatures,
      };
    };
  </script>
