<template>
    <div class="map-container">
      <div class="game-header">
        <template v-if="!gameEnded">
          <div class="game-info">
            <div class="score-display">Score: {{ score }}/{{ totalRoundsLocal }}</div>
            <div class="round-display">Round: {{ currentRound }}/{{ totalRoundsLocal }}</div>
            <div class="attempts-display">Attempts: {{ currentAttempts }}/3</div>
            <div class="timer-display">Time: {{ formattedTime }}</div>
          </div>
          <div class="target-state">Find: {{ targetState }}</div>
          <button class="skip-btn" @click="skipState">Skip</button>
          <div v-if="feedback" :class="['feedback', feedbackType]">
            {{ feedback }}
          </div>
        </template>
        <template v-else>
          <div class="game-end">
            <div class="final-score">
              Final Score: {{ score }}/{{ totalRoundsLocal }}
              <div class="final-time">Time: {{ formattedTime }}</div>
            </div>
            <button class="new-game-btn" @click="startNewGame">
              Play Again
            </button>
          </div>
        </template>
      </div>
      <div ref="map" style="height: calc(100vh - 64px); width: 100%" />
    </div>
  </template>
  
  <script setup lang="ts">
  import L from "leaflet";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useTheme } from "vuetify";
import type { GeoJSONFeature, GeoJSONLayer } from "../utils/geojsonUtils";
import {
  defaultStyle,
  failedStyle,
  getStyleForAttempts,
  isFeatureCollection,
  selectedStyle,
} from "../utils/geojsonUtils";
  
  const theme = useTheme();
  const tileLayer = ref<L.TileLayer | null>(null);
  const leafletMap = ref<L.Map | null>(null);
  
  watch(
    () => theme.global.name.value,
    (newTheme) => {
      document.documentElement.setAttribute("data-theme", newTheme);
      if (tileLayer.value) {
        tileLayer.value.setUrl(
          `https://{s}.basemaps.cartocdn.com/${newTheme}_nolabels/{z}/{x}/{y}{r}.png`
        );
      }
      if (geojsonLayer.value) {
        geojsonLayer.value.eachLayer((layer) => {
          const geoLayer = layer as GeoJSONLayer;
          const stateName = geoLayer.feature?.properties?.name;
          if (foundStates.value.has(stateName)) {
            (layer as L.Path).setStyle(
              getStyleForAttempts(foundStates.value.get(stateName))
            );
          } else {
            (layer as L.Path).setStyle(defaultStyle);
          }
        });
      }
    }
  );
  
  const totalRoundsLocal = ref(0);
  
  // Timer state
  const timer = ref(0);
  const timerInterval = ref<number | null>(null);
  const formattedTime = computed(() => {
    const minutes = Math.floor(timer.value / 60);
    const seconds = timer.value % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  });
  
  // Game state
  const map = ref<HTMLElement | null>(null);
  const geojsonLayer: Ref<L.GeoJSON | null> = ref(null);
  const targetState = ref("");
  const score = ref(0);
  const currentRound = ref(1);
  const feedback = ref("");
  const feedbackType = ref("");
  const gameEnded = ref(false);
  const currentAttempts = ref(0);
  const availableStates = ref<string[]>([]);
  const usedStates = ref<string[]>([]);
  const foundStates = ref(new Map<string, number>());
  
  const selectNewTargetState = () => {
    const remainingStates = availableStates.value.filter(
      (state) => !usedStates.value.includes(state)
    );
    if (remainingStates.length === 0) {
      usedStates.value = [];
      const randomIndex = Math.floor(
        Math.random() * availableStates.value.length
      );
      const newTarget = availableStates.value[randomIndex];
      usedStates.value.push(newTarget);
      targetState.value = newTarget;
    } else {
      const randomIndex = Math.floor(
        Math.random() * remainingStates.length
      );
      const newTarget = remainingStates[randomIndex];
      usedStates.value.push(newTarget);
      targetState.value = newTarget;
    }
    currentAttempts.value = 0;
  };
  
  const showFeedback = (isCorrect: boolean, customMsg?: string) => {
    feedbackType.value = isCorrect ? "correct" : "incorrect";
    if (customMsg) {
      feedback.value = customMsg;
    } else if (isCorrect) {
      feedback.value =
        currentAttempts.value === 1 ? "Perfect! Well done!" : "Correct!";
    } else {
      feedback.value =
        currentAttempts.value === 3
          ? `Out of attempts! The correct state was ${targetState.value}`
          : `Wrong! Try again to find ${targetState.value}`;
    }
    setTimeout(() => {
      feedback.value = "";
      feedbackType.value = "";
    }, 2000);
  };
  
  const endGame = () => {
    gameEnded.value = true;
    stopTimer();
  };
  
  const startTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
    }
    timer.value = 0;
    timerInterval.value = setInterval(() => {
      timer.value++;
    }, 1000);
  };
  
  const stopTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value);
      timerInterval.value = null;
    }
  };
  
  const startNewGame = () => {
    score.value = 0;
    currentRound.value = 1;
    currentAttempts.value = 0;
    gameEnded.value = false;
    usedStates.value = [];
    foundStates.value.clear();
    selectNewTargetState();
    startTimer();
    if (geojsonLayer.value) {
      geojsonLayer.value.eachLayer((layer) => {
        (layer as L.Path).setStyle(defaultStyle);
      });
    }
  };
  
  /**
   * Computes the scale factor based on the element's minimum dimension.
   * - Very small countries (minDim < 50) will now scale much more (up to a factor of 10).
   * - Medium countries (minDim between 50 and 150) get a moderate enlargement.
   * - Large countries (minDim >= 150) are scaled only slightly.
   */
  function computeScaleFactor(bbox: SVGRect): number {
    const minDim = Math.min(bbox.width, bbox.height);
    if (minDim < 50) {
      return Math.min(50 / minDim, 10);
    } else if (minDim < 150) {
      return 1.5;
    } else {
      return 1.2;
    }
  }
  
  /**
   * Animates a given layer.
   * It brings the layer to the front, computes the appropriate scale factor,
   * sets the transform origin to the element's geometric center, and applies the animation.
   */
  function animateLayer(layer: L.Layer) {
    const pathLayer = layer as L.Path;
    const element = pathLayer.getElement();
    if (element) {
      // Bring the layer to the front
      pathLayer.bringToFront();
  
      const svgEl = element as unknown as SVGGraphicsElement & { style: CSSStyleDeclaration };
      const bbox = svgEl.getBBox();
      // Calculate the center of the bounding box.
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;
      const scaleFactor = computeScaleFactor(bbox);
  
      // Set the custom CSS variable for the scale factor.
      svgEl.style.setProperty("--target-scale", scaleFactor.toString());
      svgEl.style.transformOrigin = `${centerX}px ${centerY}px`;
  
      // Apply the animation.
      element.classList.add("state-reveal-animation");
      element.addEventListener(
        "animationend",
        () => {
          element.classList.remove("state-reveal-animation");
        },
        { once: true }
      );
    }
  }
  
  const skipState = () => {
    if (gameEnded.value) return;
    currentAttempts.value = 3;
    if (geojsonLayer.value) {
      geojsonLayer.value.eachLayer((l) => {
        const geoL = l as GeoJSONLayer;
        if (geoL.feature?.properties?.name === targetState.value) {
          (l as L.Path).setStyle(failedStyle);
          animateLayer(l);
        }
      });
    }
    foundStates.value.set(targetState.value, 4);
    showFeedback(
      false,
      `Skipped! The correct state was ${targetState.value}`
    );
    if (currentRound.value === totalRoundsLocal.value) {
      setTimeout(endGame, 1000);
    } else {
      currentRound.value++;
      setTimeout(() => {
        selectNewTargetState();
      }, 1000);
    }
  };
  
  const onStateClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value) return;
    const layer = e.target as GeoJSONLayer;
    const clickedState = layer.feature.properties.name;
    if (leafletMap.value) {
      L.popup({
        autoClose: true,
        closeButton: false,
        className: "wrong-state-popup",
      })
        .setLatLng(e.latlng)
        .setContent(clickedState)
        .openOn(leafletMap.value as L.Map);
    }
    if (clickedState === targetState.value) {
      currentAttempts.value++;
      if (currentAttempts.value === 1) {
        score.value++;
      }
      showFeedback(true);
      if (geojsonLayer.value) {
        geojsonLayer.value.eachLayer((l) => {
          const geoL = l as GeoJSONLayer;
          if (geoL.feature?.properties?.name === clickedState) {
            (l as L.Path).setStyle(getStyleForAttempts(currentAttempts.value));
          }
        });
      }
      foundStates.value.set(clickedState, currentAttempts.value);
      if (currentRound.value === totalRoundsLocal.value) {
        setTimeout(endGame, 1000);
      } else {
        currentRound.value++;
        setTimeout(() => {
          selectNewTargetState();
        }, 1000);
      }
    } else {
      currentAttempts.value++;
      if (currentAttempts.value >= 3 && geojsonLayer.value) {
        geojsonLayer.value.eachLayer((l) => {
          const geoL = l as GeoJSONLayer;
          if (geoL.feature?.properties?.name === targetState.value) {
            (l as L.Path).setStyle(failedStyle);
            animateLayer(l);
          }
        });
        foundStates.value.set(targetState.value, 4);
        showFeedback(false);
        if (currentRound.value === totalRoundsLocal.value) {
          setTimeout(endGame, 1000);
        } else {
          currentRound.value++;
          setTimeout(() => {
            selectNewTargetState();
          }, 1000);
        }
      } else {
        showFeedback(false);
        if (geojsonLayer.value) {
          geojsonLayer.value.eachLayer((l) => {
            const geoL = l as GeoJSONLayer;
            if (geoL.feature?.properties?.name === clickedState) {
              (l as L.Path).setStyle(defaultStyle);
            }
          });
        }
        setTimeout(() => {
          if (!foundStates.value.has(clickedState) && geojsonLayer.value) {
            geojsonLayer.value.eachLayer((l) => {
              const geoL = l as GeoJSONLayer;
              if (geoL.feature?.properties?.name === clickedState) {
                (l as L.Path).setStyle(defaultStyle);
              }
            });
          }
        }, 1000);
      }
    }
  };
  
  onMounted(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme.global.name.value
    );
    startTimer();
    if (!map.value) return;
    const leafletMapInstance = L.map(map.value, {
      minZoom: 2,
      maxZoom: 12,
      worldCopyJump: true,
      center: [37.0902, -95.7129],
      zoom: 4,
      maxBounds: [
        [15, -125],
        [50, -60],
      ],
      maxBoundsViscosity: 1.0,
    });
    leafletMap.value = leafletMapInstance;
    const tileLayerInstance = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/{themeName}_nolabels/{z}/{x}/{y}{r}.png"
        .replace(
          "{themeName}",
          theme.global.name.value === "dark" ? "dark" : "light"
        ),
      {
        attribution: "",
        noWrap: false,
      }
    ).addTo(leafletMapInstance);
    tileLayer.value = tileLayerInstance;
    fetch(
      "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_admin_1_states_provinces_shp.geojson"
    )
      .then((response) => response.json())
      .then((data: unknown) => {
        if (isFeatureCollection(data)) {
          const numberOfStates = data.features.length;
          totalRoundsLocal.value = Math.min(numberOfStates, 52);
          availableStates.value = data.features
            .map((feature) => feature.properties?.name)
            .filter((name): name is string => name !== undefined);
          selectNewTargetState();
          geojsonLayer.value = L.geoJSON(data, {
            style: defaultStyle,
            onEachFeature: (feature, layer) => {
              layer.on({
                click: onStateClick,
                mouseover: (e) => {
                  const geoLayer = e.target as GeoJSONLayer;
                  const stateName = geoLayer.feature.properties.name;
                  if (!foundStates.value.has(stateName)) {
                    geojsonLayer.value?.eachLayer((l) => {
                      const geoL = l as GeoJSONLayer;
                      if (geoL.feature?.properties?.name === stateName) {
                        (l as L.Path).setStyle({
                          ...defaultStyle,
                          fillOpacity: 0.7,
                        });
                      }
                    });
                  }
                },
                mouseout: (e) => {
                  const geoLayer = e.target as GeoJSONLayer;
                  const stateName = geoLayer.feature.properties.name;
                  if (!foundStates.value.has(stateName)) {
                    geojsonLayer.value?.eachLayer((l) => {
                      const geoL = l as GeoJSONLayer;
                      if (geoL.feature?.properties?.name === stateName) {
                        (l as L.Path).setStyle(defaultStyle);
                      }
                    });
                  }
                },
              });
            },
          }).addTo(leafletMapInstance);
        }
      });
  });
  </script>
  
  <style>
  :root {
    color-scheme: light dark;
    --header-bg: rgba(255, 255, 255, 0.9);
    --text-color: #333333;
    --map-default-fill: #f0f0f0;
    --map-border-color: #cccccc;
    --map-bg: #ffffff;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --header-bg: rgba(51, 51, 51, 0.9);
      --text-color: #ffffff;
      --map-default-fill: #333333;
      --map-border-color: #666666;
      --map-bg: #2f343a;
    }
  }
  [data-theme="light"] {
    --header-bg: rgba(255, 255, 255, 0.9);
    --text-color: #333333;
    --map-default-fill: #f0f0f0;
    --map-border-color: #cccccc;
    --map-bg: #ffffff;
  }
  [data-theme="dark"] {
    --header-bg: rgba(51, 51, 51, 0.9);
    --text-color: #ffffff;
    --map-default-fill: #333333;
    --map-border-color: #666666;
    --map-bg: #2f343a;
  }
  .map-container {
    position: relative;
  }
  .game-header {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    background-color: var(--header-bg);
    padding: 15px;
    border-radius: 8px;
    min-width: 200px;
  }
  .game-info {
    display: flex;
    gap: 20px;
    color: var(--text-color);
    font-size: 18px;
  }
  .target-state {
    color: var(--text-color);
    font-size: 20px;
    font-weight: bold;
  }
  .skip-btn {
    background-color: #e67e22;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 10px;
  }
  .skip-btn:hover {
    background-color: #d35400;
  }
  .feedback {
    padding: 5px 10px;
    border-radius: 4px;
    font-weight: bold;
  }
  .feedback.correct {
    background-color: rgba(75, 181, 67, 0.9);
    color: white;
  }
  .feedback.incorrect {
    background-color: rgba(181, 67, 67, 0.9);
    color: white;
  }
  .game-end {
    text-align: center;
  }
  .final-score {
    color: var(--text-color);
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 15px;
  }
  .final-time {
    font-size: 18px;
    margin-top: 5px;
    color: var(--text-color);
  }
  .timer-display {
    color: var(--text-color);
    font-size: 18px;
    font-weight: bold;
  }
  .new-game-btn {
    background-color: #4a90e2;
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .new-game-btn:hover {
    background-color: #357abd;
  }
  .leaflet-container {
    background-color: var(--map-bg) !important;
  }
  .leaflet-popup-content {
    background-color: var(--header-bg);
    color: var(--text-color);
  }
  .leaflet-popup-tip {
    background-color: var(--header-bg);
  }
  .leaflet-control-container .leaflet-top,
  .leaflet-control-container .leaflet-bottom {
    display: none;
  }
  
  /* Exaggerated animation using the computed --target-scale */
  .state-reveal-animation {
    animation: highlight-pulse 2s ease-in-out;
  }
  @keyframes highlight-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px red);
    }
    50% {
      transform: scale(var(--target-scale));
      filter: drop-shadow(0 0 50px red);
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px red);
    }
  }
  .wrong-state-popup {
    font-weight: bold;
    color: var(--text-color);
    background: var(--header-bg);
    border: 1px solid var(--map-border-color);
    border-radius: 4px;
    padding: 4px 8px;
  }
  </style>
  