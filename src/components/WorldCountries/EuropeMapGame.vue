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
import type { FeatureCollection, Geometry, Feature, Position } from "geojson";
import L from "leaflet";
import MapGame from "../MapGame.vue";
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const mapOptions = {
  initialCenter: [55, 15] as L.LatLngExpression,
  initialZoom: 4,
  minZoom: 3,
  maxZoom: 12,
  worldCopyJump: false,
  maxBoundsViscosity: 1.0,
};

const additionalCountries = [
  "Turkey",
  "Cyprus",
  "Greenland",
];

const gibraltarFeature: Feature<Geometry, GeoJSONProperties> = {
  type: "Feature",
  properties: {
    name: "Gibraltar",
    continent: "Europe",
    name_long: "Gibraltar",
    admin: "United Kingdom",
    abbrev: "Gib.",
    formal_en: "Gibraltar",
    sovereignt: "United Kingdom",
    pop_est: 33701,
    gdp_md_est: 2044,
    economy: "2. Developed region: nonG7",
    income_grp: "1. High income: OECD"
  },
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-5.3536, 36.1086],
        [-5.3384, 36.1086],
        [-5.3384, 36.1225],
        [-5.3438, 36.1449],
        [-5.3536, 36.1449],
        [-5.3589, 36.1225],
        [-5.3536, 36.1086]
      ]
    ]
  }
};

// Define the latitude threshold for Svalbard
const SVALBARD_LATITUDE_THRESHOLD = 72;

// Function to check if a polygon has any point above threshold
const isPolygonAboveThreshold = (polygon: Position[][]): boolean => {
  // Check if any point in any ring is above the threshold
  return polygon.some(ring => ring.some(point => point[1] > SVALBARD_LATITUDE_THRESHOLD));
};

// Function to split Norway into mainland and Svalbard
const splitNorwayTerritory = (
  data: FeatureCollection<Geometry, GeoJSONProperties>,
  filteredFeatures: Feature<Geometry, GeoJSONProperties>[] // Also type the input array more specifically
): {
  mainlandNorway: Feature<Geometry, GeoJSONProperties> | null;
  svalbard: Feature<Geometry, GeoJSONProperties> | null;
} => {
// --- End Change ---
  // Find Norway feature in the original data
  const norwayFeature = data.features.find(f => f.properties?.name === "Norway");

  // Return early if Norway not found or invalid
  if (!norwayFeature || !norwayFeature.geometry || norwayFeature.geometry.type !== "MultiPolygon") {
    console.error("Invalid Norway feature or not found");
    return { mainlandNorway: null, svalbard: null };
  }

  // --- Start Change: Ensure properties are handled for mainlandNorway ---
  // Handle potential null properties from the source feature type-safely
  // Do this *before* checking the index, as we need it for mainlandNorway creation
  const baseNorwayProperties = norwayFeature.properties ?? {};
  // --- End Change ---

  // Find Norway in filteredFeatures to update later
  const norwayIndex = filteredFeatures.findIndex(f => f.properties?.name === "Norway");
  // Note: If Norway isn't found in filteredFeatures, we might proceed but won't update it.
  // Consider if returning early here is desired if norwayIndex is -1.
  // if (norwayIndex === -1) {
  //   console.error("Norway not found in filtered features for update");
  //   // Decide whether to return or continue without updating
  //   // return { mainlandNorway: null, svalbard: null };
  // }


  // Split Norway's polygons into mainland and Svalbard
  const mainlandPolygons = [];
  const svalbardPolygons = [];

  for (const polygon of norwayFeature.geometry.coordinates) {
    if (isPolygonAboveThreshold(polygon)) {
      svalbardPolygons.push(polygon);
    } else {
      mainlandPolygons.push(polygon);
    }
  }

  // Create modified Norway with only mainland polygons
  // --- Start Change: Add explicit type and use baseNorwayProperties ---
  const mainlandNorway: Feature<Geometry, GeoJSONProperties> | null =
    mainlandPolygons.length > 0 ? {
      type: "Feature", // Ensure type is Feature
      properties: { // Ensure properties are not null
          ...baseNorwayProperties, // Use the safe properties object
          // You might want to update specific properties if needed, e.g., name_long
      },
      geometry: {
        type: "MultiPolygon", // Ensure geometry matches the coordinates type
        coordinates: mainlandPolygons
      }
    } : null; // Handle case where there are no mainland polygons (unlikely for Norway)
  // --- End Change ---


  // Create Svalbard with northern polygons
  // Type annotation here is already correct from previous step
  const svalbard: Feature<Geometry, GeoJSONProperties> | null =
    svalbardPolygons.length > 0 ? {
      type: "Feature",
      properties: {
        ...baseNorwayProperties, // Use the safe properties object
        name: "Svalbard",
        name_long: "Svalbard and Jan Mayen",
        admin: "Norway",
        abbrev: "Svb.",
        formal_en: "Svalbard",
        sovereignt: "Norway",
        pop_est: 2667,
        gdp_md_est: 0,
        economy: "2. Developed region: nonG7",
        income_grp: "1. High income: OECD"
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: svalbardPolygons
      }
  } : null;

  // Update Norway in the filtered features
  // --- Start Change: Check mainlandNorway is not null before updating ---
  if (norwayIndex !== -1 && mainlandNorway) {
    filteredFeatures[norwayIndex] = mainlandNorway;
  }
  // --- End Change ---

  return { mainlandNorway, svalbard };
};

const filterEuropeData = (
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> => {
  const cyprusFeature = data.features.find(f => f.properties?.name === "Cyprus");
  const northCyprusFeature = data.features.find(f => f.properties?.name === "N. Cyprus");

  let filteredFeatures = data.features.filter((feature) => {
    // Filter for European countries or additional countries, but exclude N. Cyprus
    // as we'll be merging it with Cyprus
    return (feature.properties?.continent === "Europe" ||
           (additionalCountries.includes(feature.properties.name) &&
            feature.properties.name !== "N. Cyprus"));
  });

  // If we found both Cyprus features, merge them
  if (cyprusFeature && northCyprusFeature) {
    // Make sure we're working with valid geometries
    const validCyprusGeometry = cyprusFeature.geometry.type === "Polygon" || cyprusFeature.geometry.type === "MultiPolygon";
    const validNCyprusGeometry = northCyprusFeature.geometry.type === "Polygon" || northCyprusFeature.geometry.type === "MultiPolygon";

    if (validCyprusGeometry && validNCyprusGeometry) {
      // Find the index of Cyprus in our filtered features
      const cyprusIndex = filteredFeatures.findIndex(f => f.properties?.name === "Cyprus");

      if (cyprusIndex !== -1) {
        let combinedCoordinates: Position[][][] = [];

        // Handle Cyprus coordinates based on its geometry type
        if (cyprusFeature.geometry.type === "Polygon") {
          combinedCoordinates.push(cyprusFeature.geometry.coordinates);
        } else if (cyprusFeature.geometry.type === "MultiPolygon") {
          combinedCoordinates = [...combinedCoordinates, ...cyprusFeature.geometry.coordinates];
        }

        // Handle Northern Cyprus coordinates based on its geometry type
        if (northCyprusFeature.geometry.type === "Polygon") {
          combinedCoordinates.push(northCyprusFeature.geometry.coordinates);
        } else if (northCyprusFeature.geometry.type === "MultiPolygon") {
          combinedCoordinates = [...combinedCoordinates, ...northCyprusFeature.geometry.coordinates];
        }

        const combinedFeature: Feature<Geometry, GeoJSONProperties> = {
          type: "Feature",
          properties: {
            ...cyprusFeature.properties,
            name: "Cyprus",
            name_long: "Republic of Cyprus",
            note: "Combined feature including Northern Cyprus"
          },
          geometry: {
            type: "MultiPolygon",
            coordinates: combinedCoordinates
          }
        };

        // Replace the Cyprus feature with our combined feature
        filteredFeatures[cyprusIndex] = combinedFeature;
      }
    }
  }

  // Add Gibraltar to our filtered features
  filteredFeatures.push(gibraltarFeature);

  // Split Norway into mainland and Svalbard
  const { svalbard } = splitNorwayTerritory(data, filteredFeatures);
  if (svalbard) {
    filteredFeatures.push(svalbard);
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
