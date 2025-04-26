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
          <button
            class="skip-btn"
            :disabled="!!feedback"
            @click="skipCapital"
          >
            Skip
          </button>
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

      <div v-if="!gameEnded && targetCapital && currentGuess" class="distance-info">
        <div class="distance-display">
          Distance: {{ currentDistance ? formatDistance(currentDistance) : "N/A" }}
        </div>
      </div>

      <div class="instructions" v-if="!gameStarted">
        <div class="instructions-box">
          <h2>Capital City Guessing Game</h2>
          <p>Click anywhere on the map to guess the location of the capital city.</p>
          <p>Get points based on how close your guess is to the actual location!</p>
          <button class="new-game-btn" @click="startNewGame">Start Game</button>
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
  import ScoreDisplay from "./ScoreDisplay.vue";

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
    skipCapital,
    handleGuess,
    formatDistance,
    calculateScore,
  } = gameLogic;

  // When a user clicks on the map to make a guess
  const onMapClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value || feedback.value || !targetCapital.value) return;

    // Clear previous markers
    if (markersLayer.value) {
      markersLayer.value.clearLayers();
    }

    // Add marker for the user's guess
    if (leafletMap.value && markersLayer.value) {
      guessMarker.value = L.marker(e.latlng, { icon: guessIcon })
        .addTo(markersLayer.value)
        .bindPopup('Your guess')
        .openPopup();

      // Add marker for the actual location
      const actualLocation = L.latLng(
        targetCapital.value.location[0],
        targetCapital.value.location[1]
      );

      actualMarker.value = L.marker(actualLocation, { icon: actualIcon })
        .addTo(markersLayer.value)
        .bindPopup(`${targetCapital.value.name}, ${targetCapital.value.country}`)
        .openPopup();

      // Draw a line between the guess and actual location
      distanceLine.value = L.polyline([e.latlng, actualLocation], {
        color: '#3498db',
        weight: 3,
        opacity: 0.7,
        dashArray: '5, 8'
      }).addTo(markersLayer.value);

      // Adjust map to show both markers
      const bounds = L.latLngBounds([e.latlng, actualLocation]);
      leafletMap.value.fitBounds(bounds, {
        padding: [100, 100],
        maxZoom: 6
      });
    }

    // Process the guess in game logic
    handleGuess(e.latlng);

    // Add to guess history if we have a target capital
    if (targetCapital.value && currentDistance.value !== null) {
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

    const map = L.map(mapElement.value, {
      ...props.mapOptions,
      center: props.mapOptions.initialCenter,
      zoom: props.mapOptions.initialZoom,
    });
    leafletMap.value = map;

    const currentTheme = theme.global.name.value;
    tileLayer.value = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${currentTheme}_nolabels/{z}/{x}/{y}{r}.png`,
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        noWrap: !props.mapOptions.worldCopyJump,
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
