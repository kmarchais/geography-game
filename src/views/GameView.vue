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

    <!-- Difficulty Selection Dialog -->
    <v-dialog
      v-model="showDifficultySelector"
      :persistent="true"
      max-width="900px"
    >
      <DifficultySelector
        :default-difficulty="selectedDifficulty"
        @select="onDifficultySelected"
        @cancel="goHome"
      />
    </v-dialog>

    <!-- Game Content -->
    <div
      v-if="gameDefinition && selectedDifficulty"
      class="game-content"
    >
      <MapGame
        :key="`${gameDefinition.id}-${selectedDifficulty}`"
        :entity-name-singular="gameDefinition.config.targetLabel"
        :entity-name-plural="`${gameDefinition.config.targetLabel}s`"
        :geojson-url="resolvedDataUrl"
        :geojson-name-property="gameDefinition.config.propertyName"
        :total-rounds-override="totalRounds"
        :map-options="mapOptions"
        :process-geojson-data-fn="processGeoJsonData"
        :game-id="gameDefinition.id"
        :game-name="gameDefinition.name"
        :difficulty="selectedDifficulty"
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
import DifficultySelector from "../components/DifficultySelector.vue";
import type { GameDefinition } from "../types/gameRegistry";
import type { FeatureCollection, Geometry } from "geojson";
import type { GeoJSONProperties } from "../utils/geojsonUtils";
import type { DifficultyMode } from "../types/difficulty";

const route = useRoute();
const router = useRouter();
const registry = useGameRegistry();

const loading = ref(true);
const error = ref<string | null>(null);
const gameDefinition = ref<GameDefinition | null>(null);

// Difficulty selection
const showDifficultySelector = ref(false);
const selectedDifficulty = ref<DifficultyMode | undefined>(undefined);

function onDifficultySelected(difficulty: DifficultyMode) {
  selectedDifficulty.value = difficulty;
  showDifficultySelector.value = false;
}

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

  // If it starts with '/', it's root-relative, prepend BASE_URL
  if (dataUrl.startsWith('/')) {
    return `${import.meta.env.BASE_URL}${dataUrl.substring(1)}`;
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

    // Get game from registry
    const game = registry.getGameById(gameId);

    if (!game) {
      throw new Error(`Game not found: ${gameId}`);
    }

    gameDefinition.value = game;
    loading.value = false;

    // Show difficulty selector after game loads
    showDifficultySelector.value = true;
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
