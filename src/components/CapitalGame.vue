<template>
  <div class="map-container">
    <div class="game-header">
      <template v-if="!gameEnded">
        <div class="game-info">
          <div class="score-display">
            Score: {{ score }}
          </div>
          <div class="round-display">
            Round: {{ currentRound }}/{{ totalRoundsComputed }}
          </div>
          <div class="timer-display">
            Time: {{ formattedTime }}
          </div>
        </div>
        <div class="target-entity">
          Find: {{ targetCapital?.name }} ({{ targetCapital?.country }})
        </div>
        <div
          v-if="feedback"
          :class="['feedback', feedbackType]"
        >
          {{ feedback }}
        </div>
      </template>
      <template v-else>
        <div class="game-end">
          <div class="final-score">
            Final Score: {{ score }}
            <div class="final-time">
              Time: {{ formattedTime }}
            </div>
          </div>
          <button
            class="new-game-btn"
            @click="startNewGame"
          >
            Play Again
          </button>
        </div>
      </template>
    </div>

    <div
      ref="mapElement"
      class="map-render-area"
    />

    <div
      v-if="!gameEnded && targetCapital && currentGuess"
      class="distance-info"
    >
      <div class="distance-display">
        Distance: {{ currentDistance ? formatDistance(currentDistance) : "N/A" }}
      </div>
    </div>

    <div
      v-if="!gameStarted"
      class="instructions"
    >
      <div class="instructions-box">
        <h2>Capital City Guessing Game</h2>
        <p>Click anywhere on the map to guess the location of the city.</p>
        <button
          class="new-game-btn"
          @click="startNewGame"
        >
          Start Game
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import {
    onMounted,
    onUnmounted,
    ref,
    watch,
    shallowRef,
    computed,
  } from "vue";
  import { useTheme } from "vuetify";
  import { useCapitalGameLogic, type Capital } from "../composables/useCapitalGameLogic";
  import { worldCapitals } from "../utils/capitalCitiesData";

  // Helper function to normalize longitude
  const normalizeLongitude = (lng: number): number => {
    // Normalize longitude to be within -180 to 180 degrees
    let normalized = ((lng + 180) % 360) - 180;
    if (normalized < -180) normalized += 360;
    return normalized;
  };

  // Improved Haversine distance calculation
  const calculateHaversineDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371; // Earth radius in kilometers

    // Check for invalid input values
    if (isNaN(lat1) || isNaN(lng1) || isNaN(lat2) || isNaN(lng2)) {
      console.error("Invalid coordinates detected:", { lat1, lng1, lat2, lng2 });
      return 0; // Return 0 instead of NaN for better user experience
    }

    // Ensure all values are numbers
    const lat1Num = Number(lat1);
    const lng1Num = Number(lng1);
    const lat2Num = Number(lat2);
    const lng2Num = Number(lng2);

    // Normalize longitudes
    const normalizedLng1 = normalizeLongitude(lng1Num);
    const normalizedLng2 = normalizeLongitude(lng2Num);

    // Convert to radians
    const lat1Rad = lat1Num * Math.PI / 180;
    const lat2Rad = lat2Num * Math.PI / 180;
    const dLat = (lat2Num - lat1Num) * Math.PI / 180;

    // Find the shortest distance around the globe
    let dLng = (normalizedLng2 - normalizedLng1) * Math.PI / 180;
    if (Math.abs(dLng) > Math.PI) {
      dLng = dLng > 0 ? dLng - 2 * Math.PI : dLng + 2 * Math.PI;
    }

    const a =
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) *
      Math.sin(dLng/2) * Math.sin(dLng/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const props = defineProps<{
    totalRoundsOverride?: number;
    mapOptions: {
      initialCenter: L.LatLngExpression;
      initialZoom: number;
      minZoom?: number;
      maxZoom?: number;
      worldCopyJump?: boolean;
      maxBounds?: L.LatLngBoundsExpression;
      maxBoundsViscosity?: number;
    };
  }>();

  const mapElement = ref<HTMLElement | null>(null);
  const leafletMap = shallowRef<L.Map | null>(null);
  const tileLayer = shallowRef<L.TileLayer | null>(null);
  const markersLayer = shallowRef<L.LayerGroup | null>(null);
  const guessMarker = shallowRef<L.Marker | null>(null);
  const actualMarker = shallowRef<L.Marker | null>(null);
  const distanceLine = shallowRef<L.Polyline | null>(null);
  const capitals = ref<Capital[]>([]);
  const totalRoundsComputed = ref(10);
  const gameStarted = ref(false);

  // Map icon for user guesses
  const guessIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2U3NGMzYyIgd2lkdGg9IjMwcHgiIGhlaWdodD0iMzBweCI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41UzEwLjYyIDYuNSAxMiA2LjVzMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  // Map icon for actual city locations
  const actualIcon = L.icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzJlY2M3MSIgd2lkdGg9IjMwcHgiIGhlaWdodD0iMzBweCI+PHBhdGggZD0iTTEyIDJDOC4xMyAyIDUgNS4xMyA1IDljMCA1LjI1IDcgMTMgNyAxM3M3LTcuNzUgNy0xM2MwLTMuODctMy4xMy03LTctN3ptMCA5LjVjLTEuMzggMC0yLjUtMS4xMi0yLjUtMi41UzEwLjYyIDYuNSAxMiA2LjVzMi41IDEuMTIgMi41IDIuNS0xLjEyIDIuNS0yLjUgMi41eiIvPjwvc3ZnPg==',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  const theme = useTheme();
  const guessHistory = ref<Array<{
    capital: string;
    country: string;
    distance: string;
    points: number;
  }>>([]);

  const gameLogic = useCapitalGameLogic({
    availableCapitals: capitals,
    totalRounds: totalRoundsComputed,
  });

  const {
    score,
    currentRound,
    gameEnded,
    targetCapital,
    currentGuess,
    currentDistance,
    formattedTime,
    feedback,
    feedbackType,
    startNewGame: initNewGame,
    handleGuess,
    formatDistance,
    calculateScore,
  } = gameLogic;

  // Updated map click handler to properly handle world wrapping
  const onMapClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value || feedback.value || !targetCapital.value) return;

    // Clear previous markers
    if (markersLayer.value) {
      markersLayer.value.clearLayers();
    }

    // Normalize the clicked longitude
    const normalizedClickLng = normalizeLongitude(e.latlng.lng);
    const normalizedClickLatLng = L.latLng(e.latlng.lat, normalizedClickLng);

    // Debug log the coordinates
    console.log("Click coordinates:", e.latlng);
    console.log("Normalized click coordinates:", normalizedClickLatLng);
    console.log("Target coordinates:", targetCapital.value.location);

    // Add marker for the user's guess
    if (leafletMap.value && markersLayer.value) {
      guessMarker.value = L.marker(normalizedClickLatLng, { icon: guessIcon })
        .addTo(markersLayer.value)
        .bindPopup('Your guess')
        .openPopup();

      // Ensure target capital location has valid coordinates
      const targetLat = Number(targetCapital.value.location[0]);
      const targetLng = normalizeLongitude(Number(targetCapital.value.location[1]));

      if (isNaN(targetLat) || isNaN(targetLng)) {
        console.error("Invalid target coordinates:", targetCapital.value.location);
        return;
      }

      const actualLocation = L.latLng(targetLat, targetLng);

      actualMarker.value = L.marker(actualLocation, { icon: actualIcon })
        .addTo(markersLayer.value)
        .bindPopup(`${targetCapital.value.name}, ${targetCapital.value.country}`)
        .openPopup();

      // Find the closest path between the points
      // This ensures the line goes the shortest way around the globe
      const lngDiff = Math.abs(normalizedClickLng - targetLng);
      let linePoints: L.LatLng[];

      if (lngDiff > 180) {
        // If the points are far apart longitudinally, we need to create
        // a line that wraps around the globe
        if (normalizedClickLng < targetLng) {
          linePoints = [
            L.latLng(normalizedClickLatLng.lat, normalizedClickLng + 360),
            actualLocation
          ];
        } else {
          linePoints = [
            normalizedClickLatLng,
            L.latLng(actualLocation.lat, targetLng + 360)
          ];
        }
      } else {
        // Normal case - points are close enough
        linePoints = [normalizedClickLatLng, actualLocation];
      }

      // Draw a line between the guess and actual location
      distanceLine.value = L.polyline(linePoints, {
        color: '#3498db',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 8'
      }).addTo(markersLayer.value);

      // Adjust map to show both markers
      const bounds = L.latLngBounds([normalizedClickLatLng, actualLocation]);
      leafletMap.value.fitBounds(bounds, {
        padding: [100, 100],
        maxZoom: 6
      });

      // Calculate distance using the improved Haversine formula
      const distance = calculateHaversineDistance(
        normalizedClickLatLng.lat,
        normalizedClickLng,
        targetLat,
        targetLng
      );

      console.log("Calculated distance:", distance);

      // Modified to use our own distance calculation
      handleGuess(normalizedClickLatLng, distance);
    } else {
      // Fallback if map or markers layer isn't available
      handleGuess(normalizedClickLatLng);
    }

    // Add to guess history if we have a target capital
    if (targetCapital.value && currentDistance.value !== null && !isNaN(currentDistance.value)) {
      const distanceInKm = currentDistance.value;
      const points = calculateScore(distanceInKm);

      guessHistory.value.push({
        capital: targetCapital.value.name,
        country: targetCapital.value.country,
        distance: formatDistance(distanceInKm),
        points: points
      });
    }
  };

  const startNewGame = () => {
    gameStarted.value = true;

    // Clear any existing markers
    if (markersLayer.value) {
      markersLayer.value.clearLayers();
    }

    // Reset map view
    if (leafletMap.value) {
      leafletMap.value.setView(
        props.mapOptions.initialCenter,
        props.mapOptions.initialZoom
      );
    }

    // Clear guess history
    guessHistory.value = [];

    initNewGame();
  };

  // Load capital cities data
  const loadCapitalsData = async () => {
    // Use data from our comprehensive world capitals list
    capitals.value = [...worldCapitals];

    // Set the total rounds based on props or default to the number of available capitals
    totalRoundsComputed.value = props.totalRoundsOverride !== undefined
      ? props.totalRoundsOverride
      : capitals.value.length;
  };

  onMounted(async () => {
    if (!mapElement.value) {
      console.error("Map container element not found.");
      return;
    }

    // Ensure worldCopyJump is enabled
    const mapOptions = {
      ...props.mapOptions,
      center: props.mapOptions.initialCenter,
      zoom: props.mapOptions.initialZoom,
      worldCopyJump: true, // Force this to be true
    };

    const map = L.map(mapElement.value, mapOptions);
    leafletMap.value = map;

    const currentTheme = theme.global.name.value;
    tileLayer.value = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${currentTheme}_nolabels/{z}/{x}/{y}{r}.png`,
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        noWrap: false, // Make sure this is false to allow world copy wrapping
      }
    ).addTo(map);

    // Create a layer group for markers
    markersLayer.value = L.layerGroup().addTo(map);

    // Add click event listener to the map
    map.on('click', onMapClick);

    document.documentElement.setAttribute("data-theme", currentTheme);

    // Load capital cities data
    await loadCapitalsData();
  });

  onUnmounted(() => {
    if (leafletMap.value) {
      leafletMap.value.off('click', onMapClick);
      try {
        leafletMap.value.remove();
      } catch (mapError) {
        console.error("Error removing Leaflet map during unmount:", mapError);
      } finally {
        leafletMap.value = null;
      }
    }
  });

  watch(() => theme.global.name.value, (newTheme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
    if (tileLayer.value) {
      tileLayer.value.setUrl(
        `https://{s}.basemaps.cartocdn.com/${newTheme}_nolabels/{z}/{x}/{y}{r}.png`
      );
    }
  });
</script>

<style scoped>
  .distance-info {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--header-bg);
    padding: 8px 15px;
    border-radius: 8px;
    z-index: 1000;
    box-shadow: 0 2px 5px rgb(0 0 0 / 20%);
  }

  .distance-display {
    color: var(--text-color);
    font-weight: 700;
    font-size: 1rem;
  }

  .instructions {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgb(0 0 0 / 60%);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2000;
  }

  .instructions-box {
    background-color: var(--header-bg);
    padding: 20px;
    border-radius: 8px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 4px 10px rgb(0 0 0 / 30%);
  }

  .instructions-box h2 {
    color: var(--text-color);
    margin-bottom: 15px;
  }

  .instructions-box p {
    color: var(--text-color);
    margin-bottom: 10px;
    line-height: 1.5;
  }

  .feedback.good {
    background-color: rgb(241 196 15 / 90%);
  }

  .game-over-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    background-color: var(--map-bg);
    padding: 20px;
  }

  /* Inherit styles from the main component */
</style>
