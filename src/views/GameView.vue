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
      v-else-if="gameDefinition"
      class="game-content"
    >
      <ErrorBoundary>
        <MapGame
          :entity-name-singular="gameDefinition.config.targetLabel"
          :entity-name-plural="`${gameDefinition.config.targetLabel}s`"
          :geojson-url="resolvedDataUrl"
          :geojson-name-property="gameDefinition.config.propertyName"
          :total-rounds-override="totalRounds"
          :map-options="mapOptions"
          :processors="gameDefinition.config.processors"
          :process-geojson-data-fn="processGeoJsonData"
          :add-manual-markers-fn="markerFunction"
          :game-id="gameDefinition.id"
          :game-name="gameDefinition.name"
        />
      </ErrorBoundary>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useGameRegistry } from "../composables/useGameRegistry";
import { applyProcessors } from "../utils/geo/processors";
import { getMarkerFunction } from "../utils/markers";
import MapGame from "../components/MapGame.vue";
import ErrorBoundary from "../components/ErrorBoundary.vue";
import type { GameDefinition } from "../types/gameRegistry";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeoJSONProperties } from "../utils/geojsonUtils";

const route = useRoute();
const router = useRouter();
const registry = useGameRegistry();

const loading = ref(true);
const error = ref<string | null>(null);
const gameDefinition = ref<GameDefinition | null>(null);

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

  // Enable world copy jump if worldWrapping processor is used
  const hasWorldWrapping = config.processors?.includes('worldWrapping') ?? false;

  return {
    initialCenter: config.mapCenter as [number, number],
    initialZoom: config.zoom,
    minZoom: config.zoom - 2,
    maxZoom: config.zoom + 6,
    maxBounds: config.maxBounds as [[number, number], [number, number]] | undefined,
    worldCopyJump: hasWorldWrapping,
  };
});

/**
 * Resolve data URL - handle both absolute URLs and relative paths
 * Relative paths (starting with ./) are resolved using BASE_URL
 */
const resolvedDataUrl = computed(() => {
  if (!gameDefinition.value?.config.dataUrl) {
    return '';
  }

  const dataUrl = gameDefinition.value.config.dataUrl;

  // If it's an absolute URL (http:// or https://), use as-is
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  // If it's a relative path, prepend BASE_URL
  if (dataUrl.startsWith('./')) {
    const relativePath = dataUrl.substring(2); // Remove './'
    return `${import.meta.env.BASE_URL}${relativePath}`;
  }

  // If it starts with '/', check if it already includes BASE_URL
  if (dataUrl.startsWith('/')) {
    const baseUrl = import.meta.env.BASE_URL;
    // If the path already starts with BASE_URL, use as-is
    if (dataUrl.startsWith(baseUrl)) {
      return dataUrl;
    }
    // Otherwise, prepend BASE_URL
    return `${baseUrl}${dataUrl.substring(1)}`;
  }

  // Otherwise, treat as relative and prepend BASE_URL
  return `${import.meta.env.BASE_URL}${dataUrl}`;
});

/**
 * Total rounds for the game
 */
const totalRounds = computed(() => {
  return gameDefinition.value?.config.totalRounds || undefined;
});

/**
 * Marker function for manual marker placement (if specified)
 */
const markerFunction = computed(() => {
  const markerFnName = gameDefinition.value?.config.markerFunction;
  if (!markerFnName) {
    return undefined;
  }
  return getMarkerFunction(markerFnName);
});

/**
 * Process GeoJSON data using configured processors
 */
function processGeoJsonData(
  data: FeatureCollection<Geometry, GeoJSONProperties>
): FeatureCollection<Geometry, GeoJSONProperties> {
  if (!gameDefinition.value?.config.processors) {
    return data;
  }

  try {
    return applyProcessors(data, gameDefinition.value.config.processors) as FeatureCollection<Geometry, GeoJSONProperties>;
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

  try {
    const gameId = route.params.gameId as string;

    if (!gameId) {
      throw new Error("No game ID provided");
    }

    // Wait for registry to be initialized
    // This prevents race conditions when navigating directly to a game URL
    if (!registry.initialized.value) {
      console.log('[GameView] Waiting for game registry to initialize...');
      // Poll until registry is initialized (should happen quickly on app mount)
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (registry.initialized.value) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50); // Check every 50ms

        // Timeout after 5 seconds to prevent infinite waiting
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 5000);
      });
    }

    // Get game from registry
    const game = registry.getGameById(gameId);

    if (!game) {
      throw new Error(`Game not found: ${gameId}. Please check the URL or return to the home page.`);
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

  /* Fill viewport minus header (64px) */
  height: calc(100vh - 64px);
  position: relative;
  overflow: hidden;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 64px);
  padding: 20px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgb(0 0 0 / 10%);
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
