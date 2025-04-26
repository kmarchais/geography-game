<template>
  <MapGame
    entity-name-singular="State/Territory"
    entity-name-plural="States/Territories"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_1_states_provinces_shp.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterAustralianStates"
  />
</template>

  <script setup lang="ts">
  import type { FeatureCollection, Geometry } from "geojson";
  import L from "leaflet";
  import MapGame from "../MapGame.vue";
  import type { GeoJSONProperties } from "../../utils/geojsonUtils";

  const mapOptions = {
    // Centered roughly on Australia
    initialCenter: [-25, 134] as L.LatLngExpression,
    initialZoom: 4,
    minZoom: 3,
    maxZoom: 10,
    worldCopyJump: false,
    // Bounds covering Australia
    maxBounds: [
      [-45, 110], // Southwest corner (approx)
      [-10, 155], // Northeast corner (approx)
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };

  /**
   * Filters the GeoJSON data to include only features representing Australian states and territories.
   * It checks the 'iso_a2' property for 'AU' or the 'admin' property for 'Australia'.
   */
  const filterAustralianStates = (
    data: FeatureCollection<Geometry, GeoJSONProperties>
  ): FeatureCollection<Geometry, GeoJSONProperties> => {
    const filteredFeatures = data.features.filter((feature) => {
      // Check for standard ISO country code or the admin country name
      return (
        feature.properties?.iso_a2 === "AU" ||
        feature.properties?.admin === "Australia"
      );
    });

    if (filteredFeatures.length === 0) {
      console.warn(
        "Could not filter Australian states/territories based on properties, using all features from source."
      );
      // Return original data if filtering fails unexpectedly
      return data;
    }

    // Australia has 6 states and 2 territories = 8
    if (filteredFeatures.length !== 8) {
      console.warn(`Expected 8 states/territories for Australia, but found ${filteredFeatures.length}. Check GeoJSON source properties.`);
    }

    return {
      type: "FeatureCollection",
      features: filteredFeatures,
    };
  };
  </script>
