<template>
  <div class="map-container">
    <div class="game-header">
      <template v-if="!gameEnded">
        <div class="game-info">
          <div class="score-display">Score: {{ score }}/{{ totalRounds }}</div>
          <div class="round-display">Round: {{ currentRound }}/{{ totalRounds }}</div>
          <div class="attempts-display">Attempts: {{ currentAttempts }}/3</div>
          <div class="timer-display">Time: {{ formattedTime }}</div>
        </div>
        <div class="target-country">Find: {{ targetCountry }}</div>
        <button class="skip-btn" @click="skipCountry">Skip</button>
        <div v-if="feedback" :class="['feedback', feedbackType]">
          {{ feedback }}
        </div>
      </template>
      <template v-else>
        <div class="game-end">
          <div class="final-score">
            Final Score: {{ score }}/{{ totalRounds }}
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
import type { Feature, FeatureCollection } from "geojson";
import L from "leaflet";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useTheme } from "vuetify";

// Extended type definitions
interface GeoJSONFeature extends Feature {
  properties: {
    name: string;
    [key: string]: any;
  };
}
interface GeoJSONLayer extends L.Layer {
  feature: GeoJSONFeature;
}

// Type guard for FeatureCollection
function isFeatureCollection(value: unknown): value is FeatureCollection {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "FeatureCollection" &&
    "features" in value &&
    Array.isArray((value as FeatureCollection).features)
  );
}

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
        const countryName = geoLayer.feature?.properties?.name;
        if (foundCountries.value.has(countryName)) {
          (layer as L.Path).setStyle(
            getStyleForAttempts(foundCountries.value.get(countryName))
          );
        } else {
          (layer as L.Path).setStyle(defaultStyle);
        }
      });
    }
  }
);

const props = defineProps({
  totalRounds: {
    type: Number,
    default: 241,
  },
});
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
const targetCountry = ref("");
const score = ref(0);
const currentRound = ref(1);
const feedback = ref("");
const feedbackType = ref("");
const gameEnded = ref(false);
const currentAttempts = ref(0);
const availableCountries = ref<string[]>([]);
const usedCountries = ref<string[]>([]);
const foundCountries = ref(new Map<string, number>());

// Pre-defined styles
const defaultStyle = {
  fillColor: "var(--map-default-fill)",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};
const firstAttemptStyle = {
  fillColor: "#2ecc71",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};
const secondAttemptStyle = {
  fillColor: "#FFFF00",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};
const thirdAttemptStyle = {
  fillColor: "#FFA500",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};
const failedStyle = {
  fillColor: "#FF0000",
  fillOpacity: 1,
  color: "var(--map-border-color)",
  weight: 1,
  opacity: 1,
};
const selectedStyle = {
  fillOpacity: 0.7,
  weight: 2,
  opacity: 1,
};

const createShiftedGeoJSON = (
  originalData: FeatureCollection,
  longitudeShift: number
): FeatureCollection => {
  const shiftedData = JSON.parse(JSON.stringify(originalData)) as FeatureCollection;
  shiftedData.features.forEach((feature) => {
    if (feature.geometry.type === "Polygon") {
      feature.geometry.coordinates.forEach((ring: number[][]) => {
        ring.forEach((coord: number[]) => {
          coord[0] += longitudeShift;
        });
      });
    } else if (feature.geometry.type === "MultiPolygon") {
      feature.geometry.coordinates.forEach((polygon: number[][][]) => {
        polygon.forEach((ring: number[][]) => {
          ring.forEach((coord: number[]) => {
            coord[0] += longitudeShift;
          });
        });
      });
    }
  });
  return shiftedData;
};

const selectNewTargetCountry = () => {
  const remainingCountries = availableCountries.value.filter(
    (country) => !usedCountries.value.includes(country)
  );
  if (remainingCountries.length === 0) {
    usedCountries.value = [];
    const randomIndex = Math.floor(
      Math.random() * availableCountries.value.length
    );
    const newTarget = availableCountries.value[randomIndex];
    usedCountries.value.push(newTarget);
    targetCountry.value = newTarget;
  } else {
    const randomIndex = Math.floor(
      Math.random() * remainingCountries.length
    );
    const newTarget = remainingCountries[randomIndex];
    usedCountries.value.push(newTarget);
    targetCountry.value = newTarget;
  }
  currentAttempts.value = 0;
};

const getStyleForAttempts = (attempts: number | undefined) => {
  switch (attempts) {
    case 1:
      return firstAttemptStyle;
    case 2:
      return secondAttemptStyle;
    case 3:
      return thirdAttemptStyle;
    default:
      return failedStyle;
  }
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
        ? `Out of attempts! The correct country was ${targetCountry.value}`
        : `Wrong! Try again to find ${targetCountry.value}`;
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
  usedCountries.value = [];
  foundCountries.value.clear();
  selectNewTargetCountry();
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
    element.classList.add("country-reveal-animation");
    element.addEventListener(
      "animationend",
      () => {
        element.classList.remove("country-reveal-animation");
      },
      { once: true }
    );
  }
}

const skipCountry = () => {
  if (gameEnded.value) return;
  currentAttempts.value = 3;
  if (geojsonLayer.value) {
    geojsonLayer.value.eachLayer((l) => {
      const geoL = l as GeoJSONLayer;
      if (geoL.feature?.properties?.name === targetCountry.value) {
        (l as L.Path).setStyle(failedStyle);
        animateLayer(l);
      }
    });
  }
  foundCountries.value.set(targetCountry.value, 4);
  showFeedback(
    false,
    `Skipped! The correct country was ${targetCountry.value}`
  );
  if (currentRound.value === props.totalRounds) {
    setTimeout(endGame, 1000);
  } else {
    currentRound.value++;
    setTimeout(() => {
      selectNewTargetCountry();
    }, 1000);
  }
};

const onCountryClick = (e: L.LeafletMouseEvent) => {
  if (gameEnded.value) return;
  const layer = e.target as GeoJSONLayer;
  const clickedCountry = layer.feature.properties.name;
  if (leafletMap.value) {
    L.popup({
      autoClose: true,
      closeButton: false,
      className: "wrong-country-popup",
    })
      .setLatLng(e.latlng)
      .setContent(clickedCountry)
      .openOn(leafletMap.value as L.Map);
  }
  if (clickedCountry === targetCountry.value) {
    currentAttempts.value++;
    if (currentAttempts.value === 1) {
      score.value++;
    }
    showFeedback(true);
    if (geojsonLayer.value) {
      geojsonLayer.value.eachLayer((l) => {
        const geoL = l as GeoJSONLayer;
        if (geoL.feature?.properties?.name === clickedCountry) {
          (l as L.Path).setStyle(getStyleForAttempts(currentAttempts.value));
        }
      });
    }
    foundCountries.value.set(clickedCountry, currentAttempts.value);
    if (currentRound.value === props.totalRounds) {
      setTimeout(endGame, 1000);
    } else {
      currentRound.value++;
      setTimeout(() => {
        selectNewTargetCountry();
      }, 1000);
    }
  } else {
    currentAttempts.value++;
    if (currentAttempts.value >= 3 && geojsonLayer.value) {
      geojsonLayer.value.eachLayer((l) => {
        const geoL = l as GeoJSONLayer;
        if (geoL.feature?.properties?.name === targetCountry.value) {
          (l as L.Path).setStyle(failedStyle);
          animateLayer(l);
        }
      });
      foundCountries.value.set(targetCountry.value, 4);
      showFeedback(false);
      if (currentRound.value === props.totalRounds) {
        setTimeout(endGame, 1000);
      } else {
        currentRound.value++;
        setTimeout(() => {
          selectNewTargetCountry();
        }, 1000);
      }
    } else {
      showFeedback(false);
      if (geojsonLayer.value) {
        geojsonLayer.value.eachLayer((l) => {
          const geoL = l as GeoJSONLayer;
          if (geoL.feature?.properties?.name === clickedCountry) {
            (l as L.Path).setStyle(selectedStyle);
          }
        });
      }
      setTimeout(() => {
        if (!foundCountries.value.has(clickedCountry) && geojsonLayer.value) {
          geojsonLayer.value.eachLayer((l) => {
            const geoL = l as GeoJSONLayer;
            if (geoL.feature?.properties?.name === clickedCountry) {
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
    center: [20, 0],
    zoom: 2,
    maxBounds: [
      [-90, -540],
      [90, 540],
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
    "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson"
  )
    .then((response) => response.json())
    .then((data: unknown) => {
      if (isFeatureCollection(data)) {
        availableCountries.value = data.features
          .map((feature) => feature.properties?.name)
          .filter((name): name is string => name !== undefined);
        selectNewTargetCountry();
        const leftWorldData = createShiftedGeoJSON(data, -360);
        const rightWorldData = createShiftedGeoJSON(data, 360);
        const combinedData: FeatureCollection = {
          type: "FeatureCollection",
          features: [
            ...leftWorldData.features,
            ...data.features,
            ...rightWorldData.features,
          ],
        };
        geojsonLayer.value = L.geoJSON(combinedData, {
          style: defaultStyle,
          onEachFeature: (feature, layer) => {
            layer.on({
              click: onCountryClick,
              mouseover: (e) => {
                const geoLayer = e.target as GeoJSONLayer;
                const countryName = geoLayer.feature.properties.name;
                if (!foundCountries.value.has(countryName)) {
                  geojsonLayer.value?.eachLayer((l) => {
                    const geoL = l as GeoJSONLayer;
                    if (geoL.feature?.properties?.name === countryName) {
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
                const countryName = geoLayer.feature.properties.name;
                if (!foundCountries.value.has(countryName)) {
                  geojsonLayer.value?.eachLayer((l) => {
                    const geoL = l as GeoJSONLayer;
                    if (geoL.feature?.properties?.name === countryName) {
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
.target-country {
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
.country-reveal-animation {
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
.wrong-country-popup {
  font-weight: bold;
  color: var(--text-color);
  background: var(--header-bg);
  border: 1px solid var(--map-border-color);
  border-radius: 4px;
  padding: 4px 8px;
}
</style>
