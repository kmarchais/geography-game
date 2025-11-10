<template>
  <div class="map-container">
    <div class="game-header">
      <template v-if="!gameEnded">
        <div class="game-info">
          <div class="score-display">
            Score: {{ score }}/{{ totalRoundsComputed }}
          </div>
          <div class="round-display">
            Round: {{ currentRound }}/{{ totalRoundsComputed }}
          </div>
          <div class="attempts-display">
            Attempts: {{ currentAttempts }}/3
          </div>
          <div class="timer-display">
            Time: {{ formattedTime }}
          </div>
          <div
            v-if="hasTimeLimit"
            :class="['countdown-display', { 'countdown-warning': roundTimeLeft <= 5 && roundTimeLeft > 0 }]"
          >
            ⏱️ {{ roundTimeLeft }}s
          </div>
        </div>
        <div class="target-entity">
          Find: {{ targetEntity }}
        </div>
        <button
          class="skip-btn"
          :disabled="!!feedback"
          @click="handleSkip"
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
            Final Score: {{ finalScore }} points
            <div
              v-if="props.difficulty && finalScore !== baseScore"
              class="base-score-info"
            >
              (Base: {{ baseScore }}, Difficulty: {{ props.difficulty }})
            </div>
            <div class="final-time">
              Time: {{ formattedTime }}
            </div>

            <!-- Performance breakdown with chart -->
            <StatsChart
              :stats="gameStats"
              :total-rounds="totalRoundsComputed"
              :size="220"
            />

            <div
              v-if="currentGameStats"
              class="stats-summary"
            >
              <div
                v-if="isNewBestScore"
                class="new-record"
              >
                🏆 New Best Score!
              </div>
              <div
                v-if="isNewBestTime"
                class="new-record"
              >
                ⚡ New Best Time!
              </div>
              <div class="previous-best">
                Previous Best: {{ currentGameStats.bestScore }} points
              </div>
            </div>
          </div>
          <button
            class="new-game-btn"
            @click="handleNewGame"
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

    <div class="extra-controls-container">
      <slot
        name="extra-controls"
        :map="leafletMap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { FeatureCollection, Geometry, Feature } from "geojson";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css";
  import {
    onMounted,
    onUnmounted,
    ref,
    watch,
    type Ref,
    shallowRef,
    computed,
  } from "vue";
  import { useTheme } from "vuetify";
  import { useMapGameLogic } from "../composables/useMapGameLogic";
  import { useStatsStore } from "../stores/stats";
  import { useAuthStore } from "../stores/auth";
  import {
    animateLayer,
    defaultStyle,
    getStyleForAttempts,
    isFeatureCollection,
    selectedStyle,
    type GeoJSONFeature,
    type GeoJSONProperties,
  } from "../utils/geojsonUtils";
  import { fetchAndCacheGeoJSON } from "../utils/geo/geojsonCache";
  import type { ProcessorName } from "../utils/geo/processors";
  import StatsChart from "./StatsChart.vue";
  import type { DifficultyMode } from "../types/difficulty";


  interface MapOptions extends L.MapOptions {
    initialCenter: L.LatLngExpression;
    initialZoom: number;
  }

  type ProcessGeoJsonFunc = (
    data: FeatureCollection<Geometry, GeoJSONProperties>
  ) => FeatureCollection<Geometry, GeoJSONProperties>;
  type AddManualMarkersFunc = (
    map: L.Map,
    available: Ref<string[]>,
    found: Ref<Map<string, number>>,
    clickHandler: (name: string, latlng: L.LatLng) => void
  ) => void;

  const props = defineProps<{
    entityNameSingular: string;
    entityNamePlural: string;
    geojsonUrl: string;
    geojsonNameProperty: string;
    geojsonCodeProperty?: string;
    totalRoundsOverride?: number;
    processGeojsonDataFn?: ProcessGeoJsonFunc;
    processors?: ProcessorName[];
    addManualMarkersFn?: AddManualMarkersFunc;
    mapOptions: MapOptions;
    gameId?: string;
    gameName?: string;
    difficulty?: DifficultyMode;
  }>();

  const mapElement = ref<HTMLElement | null>(null);
  const leafletMap = shallowRef<L.Map | null>(null);
  const tileLayer = shallowRef<L.TileLayer | null>(null);
  const geojsonLayer = shallowRef<L.GeoJSON | null>(null);
  const availableEntities = ref<string[]>([]);
  const totalRoundsComputed = ref(0);

  const theme = useTheme();
  const gameLogic = useMapGameLogic({
    entityNameSingular: props.entityNameSingular,
    entityNamePlural: props.entityNamePlural,
    availableEntities: availableEntities,
    totalRounds: totalRoundsComputed,
    difficulty: computed(() => props.difficulty),
  });

  // Helper to extract entity name from feature properties
  const getEntityName = (properties: GeoJSONProperties | undefined): string | undefined => {
    if (!properties) return undefined;
    const value = properties[props.geojsonNameProperty];
    // Convert numbers to strings (e.g., Paris arrondissements use numeric IDs)
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return undefined;
  };

  // Helper to extract entity code from feature properties
  const getEntityCode = (properties: GeoJSONProperties | undefined): string | undefined => {
    if (!properties || !props.geojsonCodeProperty) return undefined;
    const value = properties[props.geojsonCodeProperty];
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    return undefined;
  };

  const {
    score,
    currentRound,
    currentAttempts,
    gameEnded,
    targetEntity,
    foundEntities,
    formattedTime,
    feedback,
    feedbackType,
    gameStats,
    weightedScore,
    rawScorePercentage,
    finalScore,
    baseScore,
    roundTimeLeft,
    isRoundTimedOut,
    hasTimeLimit,
    roundTimeLimit,
    startNewGame,
    skipEntity,
    handleCorrectGuess,
    handleIncorrectGuess,
  } = gameLogic;

  // Stats tracking
  const statsStore = useStatsStore();
  const authStore = useAuthStore();
  const gameHasBeenRecorded = ref(false);

  const currentGameStats = computed(() => {
    if (!props.gameId) return null;
    return statsStore.getGameStats(props.gameId);
  });

  const isNewBestScore = computed(() => {
    if (!currentGameStats.value || !gameEnded.value) return false;
    return finalScore.value > currentGameStats.value.bestScore;
  });

  const isNewBestTime = computed(() => {
    if (!currentGameStats.value || !gameEnded.value) return false;
    // Get time in seconds from formattedTime (MM:SS format)
    const parts = formattedTime.value.split(':').map(Number);
    const minutes = parts[0] ?? 0;
    const seconds = parts[1] ?? 0;
    const timeInSeconds = minutes * 60 + seconds;
    return timeInSeconds < currentGameStats.value.bestTime;
  });


  const setLayerStyle = (layer: L.Layer, style: L.PathOptions) => {
    if (layer && typeof (layer as L.Path).setStyle === 'function') {
        (layer as L.Path).setStyle(style);
    }
  };

  const updateAllLayerStyles = () => {
    if (!geojsonLayer.value) {return;}

    geojsonLayer.value.eachLayer((layer) => {
      if ('feature' in layer && layer.feature) {
          const feature = layer.feature as GeoJSONFeature;
          const entityName = feature.properties?.name;

          if (entityName) {
            const attempts = foundEntities.value.get(entityName);
            const styleToApply = getStyleForAttempts(attempts);
            setLayerStyle(layer, styleToApply);
          } else {
            setLayerStyle(layer, defaultStyle);
          }
      } else {
          if (layer instanceof L.Path) {
               setLayerStyle(layer, defaultStyle);
          }
      }
    });
  };



  const onEntityClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value || feedback.value) {return;}

    const layer = e.target as L.GeoJSON;
    const feature = layer.feature as GeoJSONFeature | undefined;

    if (!feature?.properties) {
        console.warn("Clicked layer is missing feature properties:", layer);
        return;
    }
    const clickedEntityName = getEntityName(feature.properties);
    const clickedEntityCode = getEntityCode(feature.properties);

    if (!clickedEntityName || clickedEntityName === 'Unknown') {
      console.warn("Clicked feature has invalid name property:", feature);
      return;
    }

    // Show popup regardless of found status
    if (leafletMap.value) {
      const popupContent = clickedEntityCode
        ? `${clickedEntityName} (${clickedEntityCode})`
        : clickedEntityName;
      L.popup({
        autoClose: true,
        closeButton: false,
        className: "entity-popup",
      })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(leafletMap.value);
    }

    // If the entity has already been found, do nothing further (don't count attempt)
    if (foundEntities.value.has(clickedEntityName)) {
      return;
    }

    // Proceed with guess logic only if the entity hasn't been found yet
    if (clickedEntityName === targetEntity.value) {
      handleCorrectGuess(clickedEntityName);
    } else {
      // Capture the current target before it changes
      const currentTarget = targetEntity.value;
      const { shouldEndRound } = handleIncorrectGuess();
      if (!shouldEndRound) {
        // Temporarily highlight the incorrectly clicked layer
        setLayerStyle(layer, selectedStyle);
        setTimeout(() => {
          // Check if layer still exists before trying to reset style
          if (leafletMap.value?.hasLayer(layer)) {
              // Since it was an incorrect guess on an *unfound* entity,
              // revert to the default style.
              setLayerStyle(layer, defaultStyle);
          }
        }, 1000);
      } else {
        // Round ended due to too many attempts, highlight the correct one
        highlightTargetEntity(currentTarget);
      }
    }
  };

  const onManualMarkerClick = (name: string, latlng: L.LatLng) => {
    if (gameEnded.value || feedback.value) {return;}

    // Show popup regardless of found status
    if (leafletMap.value) {
      L.popup({
        autoClose: true,
        closeButton: false,
        className: "entity-popup",
      })
        .setLatLng(latlng)
        .setContent(name)
        .openOn(leafletMap.value);
    }

    // If the entity (marker) has already been found, do nothing further
    if (foundEntities.value.has(name)) {
      return;
    }

    // Proceed with guess logic only if the entity hasn't been found yet
    if (name === targetEntity.value) {
      handleCorrectGuess(name);
    } else {
      // Capture the current target before it changes
      const currentTarget = targetEntity.value;
      const { shouldEndRound } = handleIncorrectGuess();
      if (shouldEndRound) {
        // Round ended due to too many attempts, highlight the correct one
        // (Highlighting might target a polygon even if a marker was clicked)
        highlightTargetEntity(currentTarget);
      }
      // No temporary highlight logic for markers was present, so none added here
    }
  };

  const handleSkip = () => {
    const { skippedEntity } = skipEntity();
    if (skippedEntity) {
        highlightTargetEntity(skippedEntity);
    }
  };

  const handleNewGame = () => {
    gameHasBeenRecorded.value = false;
    startNewGame();
    updateAllLayerStyles();
  };

  const highlightTargetEntity = (entityNameToHighlight: string) => {
    if (!geojsonLayer.value || !entityNameToHighlight) {return;}
    let layerFound = false;
    geojsonLayer.value.eachLayer((layer) => {
      if ('feature' in layer && layer.feature) {
          const feature = layer.feature as GeoJSONFeature;
          if (feature.properties?.name === entityNameToHighlight) {
            animateLayer(layer);
            layerFound = true;
          }
      }
    });
    if (!layerFound) {
      console.warn(`Layer for ${entityNameToHighlight} not found to animate.`);
    }
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

    document.documentElement.setAttribute("data-theme", currentTheme);

    try {
      // Use cached fetch if processors are provided, otherwise use direct fetch
      let data: FeatureCollection;
      if (props.processors && props.processors.length > 0) {
        // Use cache with processors
        data = await fetchAndCacheGeoJSON(props.geojsonUrl, props.processors);
      } else {
        // Fallback to direct fetch for backward compatibility
        const response = await fetch(props.geojsonUrl);
        if (!response.ok) {throw new Error(`HTTP error! status: ${response.status}`);}
        data = await response.json();
      }

      if (isFeatureCollection(data)) {
        data.features.forEach((feature: Feature) => {
          if (!feature.properties) {feature.properties = {};}
          if (props.geojsonNameProperty in feature.properties) {
              feature.properties.name = feature.properties[props.geojsonNameProperty];
          } else {
              console.warn(`Feature missing expected name property '${props.geojsonNameProperty}':`, feature);
              feature.properties.name = 'Unknown';
          }
          if (props.geojsonCodeProperty && props.geojsonCodeProperty in feature.properties) {
            feature.properties.code = feature.properties[props.geojsonCodeProperty];
          }
        });

        // Apply additional processing function if provided (for backward compatibility)
        // Note: If processors prop is used, processing is already done by the cache
        const processedData = (props.processGeojsonDataFn && !props.processors)
          ? props.processGeojsonDataFn(data)
          : data;

        if (isFeatureCollection(processedData)) {
          availableEntities.value = processedData.features
            .map((feature) => getEntityName(feature.properties))
            .filter((name): name is string => typeof name === "string" && name.trim() !== "" && name !== 'Unknown');

          if (availableEntities.value.length === 0) {
             console.error("No entities with valid names found in GeoJSON after processing.");
             targetEntity.value = "Error: No entities loaded";
             return;
          }

          totalRoundsComputed.value = props.totalRoundsOverride ?? availableEntities.value.length;

          geojsonLayer.value = L.geoJSON(processedData, {
            style: defaultStyle,
            onEachFeature: (feature, layer) => {
              const feat = feature as GeoJSONFeature | undefined;
              const entityName = getEntityName(feat?.properties);
              if (entityName && entityName !== 'Unknown') {
                  layer.on({
                    click: onEntityClick,
                    mouseover: (e) => {
                      const geoLayer = e.target as L.GeoJSON;
                      const feat = geoLayer.feature as GeoJSONFeature | undefined;
                      const entityName = getEntityName(feat?.properties);
                      if (entityName && !foundEntities.value.has(entityName)) {
                        setLayerStyle(layer, { ...defaultStyle, fillOpacity: 0.7 });
                      }
                    },
                    mouseout: (e) => {
                      const geoLayer = e.target as L.GeoJSON;
                      const feat = geoLayer.feature as GeoJSONFeature | undefined;
                      const entityName = getEntityName(feat?.properties);
                      if (entityName && !foundEntities.value.has(entityName)) {
                        if (leafletMap.value?.hasLayer(layer)) {
                            setLayerStyle(layer, defaultStyle);
                        }
                      }
                    },
                  });
              }
            },
            filter: (feature) => {
                const feat = feature as GeoJSONFeature | undefined;
                const entityName = getEntityName(feat?.properties);
                return entityName !== 'Unknown';
            }
          }).addTo(map);

          if (props.addManualMarkersFn) {
            props.addManualMarkersFn(map, availableEntities, foundEntities, onManualMarkerClick);
            totalRoundsComputed.value = props.totalRoundsOverride ?? availableEntities.value.length;
          }

          startNewGame();

        } else {
           console.error("Processed data is not a valid FeatureCollection.");
           targetEntity.value = "Error: Invalid map data";
        }
      } else {
        console.error("Fetched data is not a valid FeatureCollection.");
        targetEntity.value = "Error: Could not load map data";
      }
    } catch (error) {
      console.error("Failed to load or process GeoJSON data:", error);
      targetEntity.value = "Error loading map data";
    }
  });

  onUnmounted(() => {
    if (leafletMap.value) {
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
      updateAllLayerStyles();
  });

  watch(foundEntities, () => {
      updateAllLayerStyles();
  }, { deep: true });

  // Watch for game end to record stats
  watch(gameEnded, (ended) => {
    if (ended && !gameHasBeenRecorded.value && authStore.isLoggedIn && props.gameId && props.gameName) {
      // Parse time from formattedTime (MM:SS format)
      const parts = formattedTime.value.split(':').map(Number);
      const minutes = parts[0] ?? 0;
      const seconds = parts[1] ?? 0;
      const timeInSeconds = minutes * 60 + seconds;

      // Count correct answers (entries with attempts 1, 2, or 3)
      let correctAnswers = 0;
      foundEntities.value.forEach((attempts) => {
        if (attempts >= 1 && attempts <= 3) {
          correctAnswers++;
        }
      });

      // Use final score (with difficulty multiplier applied)
      const scoreToRecord = finalScore.value;
      const rawScore = rawScorePercentage.value;
      const baseScoreValue = baseScore.value;

      statsStore.recordGameResult({
        gameId: props.gameId,
        gameName: props.gameName,
        score: scoreToRecord,
        totalRounds: totalRoundsComputed.value,
        correctAnswers,
        timeInSeconds,
        timestamp: Date.now(),
        accuracy: scoreToRecord, // accuracy is now the same as score
        rawScorePercentage: rawScore, // Store exact percentage for leaderboard tiebreaking
        difficulty: props.difficulty, // Store difficulty mode
        baseScore: baseScoreValue, // Store base score before multiplier
      });

      gameHasBeenRecorded.value = true;
    }
  });
</script>

<style>
  :root {
    color-scheme: light dark;

    --header-bg: rgba(255 255 255 / 90%);
    --text-color: #333;
    --map-default-fill: #f0f0f0;
    --map-border-color: #ccc;
    --map-bg: #fff;
    --popup-bg: var(--header-bg);
    --popup-text: var(--text-color);
    --popup-border: var(--map-border-color);
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --header-bg: rgba(51 51 51 / 90%);
      --text-color: #fff;
      --map-default-fill: #333;
      --map-border-color: #666;
      --map-bg: #2f343a;
    }
  }

  [data-theme="light"] {
    --header-bg: rgba(255 255 255 / 90%);
    --text-color: #333;
    --map-default-fill: #f0f0f0;
    --map-border-color: #ccc;
    --map-bg: #fff;
  }

  [data-theme="dark"] {
    --header-bg: rgba(51 51 51 / 90%);
    --text-color: #fff;
    --map-default-fill: #333;
    --map-border-color: #666;
    --map-bg: #2f343a;
  }

  .map-container {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .map-render-area {
    flex-grow: 1;
    width: 100%;
    background-color: var(--map-bg);
  }

  .game-header {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background-color: var(--header-bg);
    padding: 10px 15px;
    border-radius: 8px;
    min-width: 250px;
    max-width: 90%;
    box-shadow: 0 2px 5px rgba(0 0 0 / 20%);
  }

  .game-info {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 15px;
    color: var(--text-color);
    font-size: clamp(.8rem, 2.5vw, 1rem);
  }

  .countdown-display {
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background-color: rgba(74, 144, 226, 0.2);
    transition: all 0.3s ease;
  }

  .countdown-warning {
    background-color: rgba(230, 126, 34, 0.3);
    animation: pulse-warning 1s ease-in-out infinite;
  }

  @keyframes pulse-warning {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  .base-score-info {
    font-size: clamp(0.7rem, 2vw, 0.85rem);
    font-weight: 400;
    opacity: 0.7;
    margin-top: 4px;
  }

  .target-entity {
    color: var(--text-color);
    font-size: clamp(1rem, 3vw, 1.25rem);
    font-weight: 700;
    text-align: center;
  }

  .skip-btn,
  .new-game-btn {
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    font-size: clamp(.8rem, 2.5vw, .9rem);
    cursor: pointer;
    transition: background-color .2s;
    margin-top: 5px;
  }

  .skip-btn {
    background-color: #e67e22;
  }

  .skip-btn:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }

  .skip-btn:not(:disabled):hover {
    background-color: #d35400;
  }

  .new-game-btn {
    background-color: #4a90e2;
  }

  .new-game-btn:hover {
    background-color: #357abd;
  }

  .feedback {
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: 700;
    color: white;
    text-align: center;
    font-size: clamp(.8rem, 2.5vw, .9rem);
  }

  .feedback.correct {
    background-color: rgb(75 181 67 / 90%);
  }

  .feedback.incorrect {
    background-color: rgb(181 67 67 / 90%);
  }

  .game-end {
    text-align: center;
  }

  .final-score {
    color: var(--text-color);
    font-size: clamp(1.2rem, 4vw, 1.5rem);
    font-weight: 700;
    margin-bottom: 10px;
  }

  .final-time {
    font-size: clamp(.9rem, 3vw, 1.1rem);
    margin-top: 5px;
    color: var(--text-color);
  }

  .stats-summary {
    margin-top: 10px;
    font-size: clamp(.8rem, 2.5vw, .95rem);
    color: var(--text-color);
  }

  .new-record {
    font-weight: 700;
    font-size: clamp(.9rem, 3vw, 1.05rem);
    margin: 5px 0;
    animation: celebrate .5s ease-in-out;
  }

  .previous-best {
    margin-top: 5px;
    opacity: .8;
  }

  @keyframes celebrate {
    0% {
      transform: scale(1);
    }

    50% {
      transform: scale(1.1);
    }

    100% {
      transform: scale(1);
    }
  }

  .leaflet-container {
    background-color: var(--map-bg) !important;
    font-family: inherit;
  }

  .entity-popup .leaflet-popup-content-wrapper {
    background: var(--popup-bg);
    color: var(--popup-text);
    border: 1px solid var(--popup-border);
    border-radius: 4px;
    box-shadow: none;
  }

  .entity-popup .leaflet-popup-content {
    margin: 8px 10px;
    font-size: .9rem;
    font-weight: 700;
    text-align: center;
    min-width: 50px;
  }

  .entity-popup .leaflet-popup-tip-container {
    width: 20px;
    height: 10px;
  }

  .entity-popup .leaflet-popup-tip {
    background: var(--popup-bg);
    border-left: 1px solid var(--popup-border);
    border-right: 1px solid var(--popup-border);
    border-bottom: 1px solid var(--popup-border);
    box-shadow: none;
  }

  .entity-reveal-animation {
    animation: highlight-pulse 1.5s ease-in-out;
  }

  @keyframes highlight-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgb(255 0 0 / 70%));
    }

    50% {
      transform: scale(var(--target-scale, 1.5));
      filter: drop-shadow(0 0 25px rgb(255 0 0 / 90%));
    }

    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 rgb(255 0 0 / 70%));
    }
  }

  .extra-controls-container {
    position: absolute;
    bottom: 20px;
    right: 10px;
    z-index: 1000;
  }

  .overseas-navigation {
    background-color: var(--header-bg);
    padding: 8px;
    border-radius: 6px;
    box-shadow: 0 1px 5px rgb(0 0 0 / 20%);
    max-width: 180px;
    opacity: .9;
    transition: opacity .3s;
  }

  .overseas-navigation:hover {
    opacity: 1;
  }

  .overseas-title {
    color: var(--text-color);
    font-weight: 700;
    font-size: 13px;
    margin-bottom: 6px;
    text-align: center;
  }

  .overseas-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: center;
  }

  .overseas-btn {
    flex: 1 0 calc(50% - 4px);
    background-color: #4a90e2;
    color: white;
    border: none;
    padding: 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color .2s;
    text-align: center;
  }

  .overseas-btn:hover {
    background-color: #357abd;
  }

  .territory-marker .territory-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid #d35400;
    background-color: var(--header-bg);
    color: var(--text-color);
    font-weight: 700;
    font-size: 10px;
    text-align: center;
    box-shadow: 0 1px 3px rgb(0 0 0 / 30%);
    cursor: pointer;
  }

  </style>
