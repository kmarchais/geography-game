<template>
  <MapGame
    entity-name-singular="Department/Territory"
    entity-name-plural="Departments/Territories"
    geojson-url="https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-avec-outre-mer.geojson"
    geojson-name-property="nom"
    geojson-code-property="code"
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
            @click="navigateTo(map, 'caribbean')"
          >
            Caribbean
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'guiana')"
          >
            Guiana
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'reunion')"
          >
            Réunion
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'mayotte')"
          >
            Mayotte
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'stpierre')"
          >
            St Pierre
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'polynesia')"
          >
            Polynesia
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'newcaledonia')"
          >
            New Caledonia
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'wallis')"
          >
            Wallis
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'taaf')"
          >
            TAAF
          </button>
          <button
            class="overseas-btn"
            @click="navigateTo(map, 'clipperton')"
          >
            Clipperton
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
import MapGame from "./MapGame.vue";
import { getStyleForAttempts } from "../utils/geojsonUtils";

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
    case "mainland": mapInstance.setView([46.6, 1.9], 5); break;
    case "caribbean": mapInstance.setView([16.5, -62.0], 7); break;
    case "guiana": mapInstance.setView([4.0, -53.0], 7); break;
    case "reunion": mapInstance.setView([-21.1, 55.5], 9); break;
    case "mayotte": mapInstance.setView([-12.8, 45.2], 10); break;
    case "stpierre": mapInstance.setView([46.8, -56.2], 9); break;
    case "polynesia": mapInstance.setView([-17.7, -149.4], 6); break;
    case "newcaledonia": mapInstance.setView([-21.5, 165.8], 7); break;
    case "wallis": mapInstance.setView([-13.7, -177.1], 9); break;
    case "taaf": mapInstance.setView([-49.3, 69.3], 6); break;
    case "clipperton": mapInstance.setView([10.3, -109.2], 10); break;
    case "world": mapInstance.setView([20, 0], 2); break;
  }
};

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

    return L.divIcon({
      className: 'territory-marker',
      html: `<div class="territory-icon" title="${territory.name}" style="border-color:${borderColor}; background-color:${bgColor}; color:${textColor};">${territory.code || territory.name.substring(0, 3)}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  additionalTerritories.forEach(territory => {
    if (!available.value.includes(territory.name)) {
      available.value.push(territory.name);
    }

    const marker = L.marker([territory.lat, territory.lng], {
      icon: createMarkerIcon(territory, found.value.get(territory.name)),
    }).addTo(markerLayer);

    markers[territory.name] = marker;

    marker.on('click', (e) => {
      clickHandler(territory.name, e.latlng);
    });
  });

  watch(found, (newFound) => {
      additionalTerritories.forEach(territory => {
          const marker = markers[territory.name];
          if (marker) {
              const attempts = newFound.get(territory.name);
              marker.setIcon(createMarkerIcon(territory, attempts));
          }
      });
  }, { deep: true });
};

</script>
