<template>
  <MapGame
    entity-name-singular="Department/Territory"
    entity-name-plural="Departments/Territories"
    geojson-url="https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-avec-outre-mer.geojson"
    geojson-name-property="nom"
    geojson-code-property="code"
    :process-geojson-data-fn="processGeojsonData"
    :map-options="mapOptions"
    :add-manual-markers-fn="addFrenchTerritoryMarkers"
    :total-rounds-override="109"
  >
    <template #extra-controls="{ map }">
      <div
        v-if="map"
        class="overseas-navigation"
      >
        <div class="overseas-title">
          Territories
        </div>
        <div class="overseas-buttons">
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'mainland')"
          >
            Mainland
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'atlantic')"
          >
            Atlantic
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'caribbean')"
          >
            Caribbean
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'indianocean')"
          >
            Indian Ocean
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'pacific')"
          >
            Pacific
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'world')"
          >
            World
          </button>
        </div>
      </div>
    </template>
  </MapGame>
</template>

<script setup lang="ts">
import L from "leaflet";
import { watch, type Ref } from "vue";
import MapGame from "../MapGame.vue";
import { getStyleForAttempts } from "../../utils/geojsonUtils";
import type { FeatureCollection, Geometry } from 'geojson';
import type { GeoJSONProperties } from "../../utils/geojsonUtils";

const mapOptions = {
  initialCenter: [46.603354, 1.888334] as L.LatLngExpression,
  initialZoom: 5,
  minZoom: 2,
  maxZoom: 12,
  worldCopyJump: true,
  maxBounds: undefined,
  maxBoundsViscosity: 0.0,
};

const navigateTo = (mapInstance: L.Map | null, region: string) => {
  if (!mapInstance) return;
  switch (region) {
    case "mainland":
      mapInstance.setView([47, 1.9], 5.5);
      break;
    case "atlantic":
      // Covers Caribbean, Guyane, St Pierre & Miquelon
      mapInstance.setView([30, -55], 4.0);
      break;
    case "indianocean":
      // Covers Réunion, Mayotte, TAAF
      mapInstance.setView([-25, 60], 3.9);
      break;
    case "pacific":
      // Covers Polynesia, Wallis, Clipperton, New Caledonia
      mapInstance.setView([-13, -140], 4.0);
      break;
    case "caribbean":
      mapInstance.setView([12, -60], 5.5);
      break;
    case "world":
      mapInstance.setView([20, 0], 2);
      break;
  }
};

// Process GeoJSON data to create east and west copies
const processGeojsonData = (data: FeatureCollection<Geometry, GeoJSONProperties>) => {
  const wrappedCollection = structuredClone(data);
  const originalFeatures = data.features;

  const eastFeatures = originalFeatures.map(feature => {
    const clone = structuredClone(feature);
    if (!clone.properties) clone.properties = {name: ""};
    clone.properties.isEastCopy = true;

    shiftCoordinates(clone, 360);
    return clone;
  });

  const westFeatures = originalFeatures.map(feature => {
    const clone = structuredClone(feature);
    if (!clone.properties) clone.properties = {name: ""};
    clone.properties.isWestCopy = true;

    shiftCoordinates(clone, -360);
    return clone;
  });

  wrappedCollection.features = [
    ...originalFeatures,
    ...eastFeatures,
    ...westFeatures
  ];

  return wrappedCollection;
};

// Shift coordinates by the specified offset
function shiftCoordinates(feature: any, offset: number) {
  if (!feature.geometry) return feature;

  const shiftPoint = (coords: number[]) => [coords[0] + offset, coords[1]];

  switch (feature.geometry.type) {
    case 'Point':
      feature.geometry.coordinates = shiftPoint(feature.geometry.coordinates);
      break;
    case 'LineString':
    case 'MultiPoint':
      feature.geometry.coordinates = feature.geometry.coordinates.map(shiftPoint);
      break;
    case 'Polygon':
    case 'MultiLineString':
      feature.geometry.coordinates = feature.geometry.coordinates.map((ring: number[][]) =>
        ring.map(shiftPoint)
      );
      break;
    case 'MultiPolygon':
      feature.geometry.coordinates = feature.geometry.coordinates.map((polygon: number[][][]) =>
        polygon.map((ring: number[][]) => ring.map(shiftPoint))
      );
      break;
  }

  return feature;
}

interface Territory {
  name: string;
  lat: number;
  lng: number;
  code: string;
}

const additionalTerritories: Territory[] = [
    { name: "Saint Pierre et Miquelon", lat: 46.83, lng: -56.33, code: "975" },
    { name: "Wallis et Futuna", lat: -13.77, lng: -177.15, code: "986" },
    { name: "Polynésie Française", lat: -17.68, lng: -149.45, code: "987" },
    { name: "Nouvelle-Calédonie", lat: -21.25, lng: 165.5, code: "988" },
    { name: "Terres Australes et Antarctiques Françaises", lat: -49.35, lng: 70.22, code: "984" },
    { name: "Saint-Martin", lat: 18.08, lng: -63.05, code: "978" },
    { name: "Saint-Barthélemy", lat: 17.9, lng: -62.83, code: "977" },
    { name: "Île de Clipperton", lat: 10.28, lng: -109.22, code: "989" }
];

type AddManualMarkersFnType = (
  map: L.Map,
  available: Ref<string[]>,
  found: Ref<Map<string, number>>,
  clickHandler: (name: string, latlng: L.LatLng) => void
) => void;

// Add markers for territories with east and west copies
const addFrenchTerritoryMarkers: AddManualMarkersFnType = (
  map,
  available,
  found,
  clickHandler
) => {
  const markers: Record<string, L.Marker> = {};
  const markerLayer = L.layerGroup().addTo(map);

  const createMarkerIcon = (territory: Territory, attempts?: number) => {
    let borderColor = '#d35400';
    let bgColor = 'var(--header-bg)';
    let textColor = 'var(--text-color)';

    if (attempts) {
        const style = getStyleForAttempts(attempts);
        if (style && typeof style.fillColor === 'string') {
          borderColor = style.fillColor;
          if (attempts > 0 && attempts < 4) {
              bgColor = style.fillColor;
              const hex = style.fillColor.replace('#', '');
              const r = parseInt(hex.substring(0, 2), 16);
              const g = parseInt(hex.substring(2, 4), 16);
              const b = parseInt(hex.substring(4, 6), 16);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              textColor = brightness > 128 ? '#000000' : '#ffffff';
          } else if (attempts === 4) {
              bgColor = style.fillColor;
              textColor = '#ffffff';
          }
        }
    }

    return L.divIcon({
      className: 'territory-marker',
      html: `<div class="territory-icon" title="${territory.name}" style="border-color:${borderColor}; background-color:${bgColor}; color:${textColor};">${territory.code || territory.name.substring(0, 3)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  // Add all territories to the available list
  additionalTerritories.forEach(territory => {
    if (!available.value.includes(territory.name)) {
      available.value.push(territory.name);
    }

    // Create the original marker
    const marker = L.marker([territory.lat, territory.lng], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer);

    markers[territory.name] = marker;

    marker.on('click', (e) => {
      clickHandler(territory.name, e.latlng);
    });

    // Create east copy (longitude + 360)
    const eastMarker = L.marker([territory.lat, territory.lng + 360], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer);

    markers[`${territory.name}_east`] = eastMarker;

    eastMarker.on('click', (e) => {
      clickHandler(territory.name, e.latlng);
    });

    // Create west copy (longitude - 360)
    const westMarker = L.marker([territory.lat, territory.lng - 360], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer);

    markers[`${territory.name}_west`] = westMarker;

    westMarker.on('click', (e) => {
      clickHandler(territory.name, e.latlng);
    });
  });

  // Update all markers when a territory is found
  watch(found, (newFound) => {
    additionalTerritories.forEach(territory => {
      const attempts = newFound.get(territory.name);

      // Update original marker
      const marker = markers[territory.name];
      if (marker) {
        marker.setIcon(createMarkerIcon(territory, attempts));
      }

      // Update east copy
      const eastMarker = markers[`${territory.name}_east`];
      if (eastMarker) {
        eastMarker.setIcon(createMarkerIcon(territory, attempts));
      }

      // Update west copy
      const westMarker = markers[`${territory.name}_west`];
      if (westMarker) {
        westMarker.setIcon(createMarkerIcon(territory, attempts));
      }
    });
  }, { deep: true });
};
</script>
