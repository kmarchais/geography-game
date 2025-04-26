<template>
  <MapGame
    entity-name-singular="State"
    entity-name-plural="States"
    geojson-url="https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_1_states_provinces_shp.geojson"
    geojson-name-property="name"
    :map-options="mapOptions"
    :process-geojson-data-fn="filterBrazilianStates"
    :total-rounds-override="27"
  />
</template>

  <script setup lang="ts">
  import type { FeatureCollection, Geometry } from "geojson";
  import L from "leaflet";
  import MapGame from "../MapGame.vue";
  import type { GeoJSONProperties } from "../../utils/geojsonUtils";

  const mapOptions = {
    // Centered roughly on Brazil
    initialCenter: [-15, -55] as L.LatLngExpression,
    initialZoom: 4,
    minZoom: 3,
    maxZoom: 10,
    worldCopyJump: false,
    // Bounds covering Brazil
    maxBounds: [
      [-35, -75], // Southwest corner (approx)
      [5, -30], // Northeast corner (approx)
    ] as L.LatLngBoundsExpression,
    maxBoundsViscosity: 1.0,
  };

  /**
   * Filters the GeoJSON data to include only features representing Brazilian states.
   * It checks the 'iso_a2' property for 'BR' or the 'admin' property for 'Brazil'.
   */
  const filterBrazilianStates = (
    data: FeatureCollection<Geometry, GeoJSONProperties>
  ): FeatureCollection<Geometry, GeoJSONProperties> => {
    const filteredFeatures = data.features.filter((feature) => {
      // Check for standard ISO country code or the admin country name
      return (
        feature.properties?.iso_a2 === "BR" ||
        feature.properties?.admin === "Brazil"
      );
    });

    if (filteredFeatures.length === 0) {
      console.warn(
        "Could not filter Brazilian states based on properties, using all features from source."
      );
      // Return original data if filtering fails unexpectedly
      return data;
    }

    // Brazil has 26 states plus the Federal District = 27
    if (filteredFeatures.length !== 27) {
      console.warn(`Expected 27 states/Federal District for Brazil, but found ${filteredFeatures.length}. Check GeoJSON source properties.`);
    }

    return {
      type: "FeatureCollection",
      features: filteredFeatures,
    };
  };
  </script>
