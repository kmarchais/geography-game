<template>
  <div class="game-view">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="loading-container"
    >
      <div class="loading-spinner" />
      <p>Loading game...</p>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="error-container"
    >
      <div class="error-icon">
        ⚠️
      </div>
      <h2>Error Loading Game</h2>
      <p>{{ error }}</p>
      <button
        class="retry-button"
        @click="loadGame"
      >
        Try Again
      </button>
      <button
        class="home-button"
        @click="goHome"
      >
        Go to Home
      </button>
    </div>

    <!-- Game Content -->
    <div
      v-else-if="gameDefinition && processedData"
      class="game-content"
    >
      <MapGame
        :entity-name-singular="gameDefinition.config.targetLabel"
        :entity-name-plural="`${gameDefinition.config.targetLabel}s`"
        :geojson-url="gameDefinition.config.dataUrl"
        :geojson-name-property="gameDefinition.config.propertyName"
        :total-rounds-override="totalRounds"
        :map-options="mapOptions"
        :process-geojson-data-fn="processGeoJsonData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGameRegistry } from "../composables/useGameRegistry";
import { applyProcessors } from "../utils/geo/processors";
import MapGame from "../components/MapGame.vue";
import type { GameDefinition } from "../types/gameRegistry";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeoJsonProperties } from "geojson";

const route = useRoute();
const router = useRouter();
const registry = useGameRegistry();

const loading = ref(true);
const error = ref<string | null>(null);
const gameDefinition = ref<GameDefinition | null>(null);
const processedData = ref<FeatureCollection | null>(null);

/**
 * Map options computed from game definition
 */
const mapOptions = computed(() => {
  if (!gameDefinition.value?.config) {
    return {
      initialCenter: [0, 0] as [number, number],
      initialZoom: 2,
      minZoom: 2,
      maxZoom: 18,
    };
  }

  const config = gameDefinition.value.config;
  return {
    initialCenter: config.mapCenter as [number, number],
    initialZoom: config.zoom,
    minZoom: config.zoom - 2,
    maxZoom: config.zoom + 6,
    maxBounds: config.maxBounds as [[number, number], [number, number]] | undefined,
  };
});

/**
 * Total rounds for the game
 */
const totalRounds = computed(() => {
  return gameDefinition.value?.config.totalRounds || undefined;
});

/**
 * Process GeoJSON data using configured processors
 */
function processGeoJsonData(
  data: FeatureCollection<Geometry, GeoJsonProperties>
): FeatureCollection<Geometry, GeoJsonProperties> {
  if (!gameDefinition.value?.config.processors) {
    return data;
  }

  try {
    return applyProcessors(data, gameDefinition.value.config.processors);
  } catch (err) {
    console.error("Error processing GeoJSON data:", err);
    return data;
  }
}

/**
 * Load game definition from registry
 */
async function loadGame() {
  loading.value = true;
  error.value = null;
  gameDefinition.value = null;
  processedData.value = null;

  try {
    const gameId = route.params.gameId as string;

    if (!gameId) {
      throw new Error("No game ID provided");
    }

    // Get game from registry
    const game = registry.getGameById(gameId);

    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    gameDefinition.value = game;
    loading.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Unknown error occurred";
    loading.value = false;
    console.error("Failed to load game:", err);
  }
}

/**
 * Navigate to home
 */
function goHome() {
  router.push("/");
}

/**
 * Load game on mount
 */
onMounted(() => {
  loadGame();
});

/**
 * Reload game when route changes
 */
watch(
  () => route.params.gameId,
  () => {
    if (route.params.gameId) {
      loadGame();
    }
  }
);
</script>

<style scoped>
.game-view {
  width: 100%;
  height: 100vh;
  position: relative;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4a90e2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-container p {
  margin-top: 20px;
  font-size: 1.1rem;
  color: var(--text-color);
}

.error-container {
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.error-container h2 {
  color: var(--text-color);
  margin-bottom: 10px;
}

.error-container p {
  color: var(--text-color);
  opacity: 0.8;
  margin-bottom: 30px;
  max-width: 600px;
}

.retry-button,
.home-button {
  padding: 10px 20px;
  margin: 5px;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button {
  background-color: #4a90e2;
  color: white;
}

.retry-button:hover {
  background-color: #357abd;
}

.home-button {
  background-color: #666;
  color: white;
}

.home-button:hover {
  background-color: #555;
}

.game-content {
  width: 100%;
  height: 100%;
}
</style>
