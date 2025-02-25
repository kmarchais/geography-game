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
          <div class="target-department">Find: {{ targetDepartment }}</div>
          <button class="skip-btn" @click="skipDepartment">Skip</button>
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
  import type { Feature, FeatureCollection } from "geojson";
  import L from "leaflet";
  import { computed, onMounted, ref, watch, type Ref } from "vue";
  import { useTheme } from "vuetify";
  
  // Extended type definitions
  interface GeoJSONFeature extends Feature {
    properties: {
      name: string;
      code: string;
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
          const departmentName = geoLayer.feature?.properties?.name;
          if (foundDepartments.value.has(departmentName)) {
            (layer as L.Path).setStyle(
              getStyleForAttempts(foundDepartments.value.get(departmentName))
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
      default: 0,
    },
  });
  
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
  const targetDepartment = ref("");
  const score = ref(0);
  const currentRound = ref(1);
  const feedback = ref("");
  const feedbackType = ref("");
  const gameEnded = ref(false);
  const currentAttempts = ref(0);
  const availableDepartments = ref<string[]>([]);
  const usedDepartments = ref<string[]>([]);
  const foundDepartments = ref(new Map<string, number>());
  
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
  
  const selectNewTargetDepartment = () => {
    const remainingDepartments = availableDepartments.value.filter(
      (department) => !usedDepartments.value.includes(department)
    );
    if (remainingDepartments.length === 0) {
      usedDepartments.value = [];
      const randomIndex = Math.floor(
        Math.random() * availableDepartments.value.length
      );
      const newTarget = availableDepartments.value[randomIndex];
      usedDepartments.value.push(newTarget);
      targetDepartment.value = newTarget;
    } else {
      const randomIndex = Math.floor(
        Math.random() * remainingDepartments.length
      );
      const newTarget = remainingDepartments[randomIndex];
      usedDepartments.value.push(newTarget);
      targetDepartment.value = newTarget;
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
          ? `Out of attempts! The correct department was ${targetDepartment.value}`
          : `Wrong! Try again to find ${targetDepartment.value}`;
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
    usedDepartments.value = [];
    foundDepartments.value.clear();
    selectNewTargetDepartment();
    startTimer();
    if (geojsonLayer.value) {
      geojsonLayer.value.eachLayer((layer) => {
        (layer as L.Path).setStyle(defaultStyle);
      });
    }
  };
  
  /**
   * Computes the scale factor based on the element's minimum dimension.
   * - Very small departments (minDim < 50) will scale much more (up to a factor of 10).
   * - Medium departments (minDim between 50 and 150) get a moderate enlargement.
   * - Large departments (minDim >= 150) are scaled only slightly.
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
      element.classList.add("department-reveal-animation");
      element.addEventListener(
        "animationend",
        () => {
          element.classList.remove("department-reveal-animation");
        },
        { once: true }
      );
    }
  }
  
  const skipDepartment = () => {
    if (gameEnded.value) return;
    currentAttempts.value = 3;
    if (geojsonLayer.value) {
      geojsonLayer.value.eachLayer((l) => {
        const geoL = l as GeoJSONLayer;
        if (geoL.feature?.properties?.name === targetDepartment.value) {
          (l as L.Path).setStyle(failedStyle);
          animateLayer(l);
        }
      });
    }
    foundDepartments.value.set(targetDepartment.value, 4);
    showFeedback(
      false,
      `Skipped! The correct department was ${targetDepartment.value}`
    );
    if (currentRound.value === totalRoundsLocal.value) {
      setTimeout(endGame, 1000);
    } else {
      currentRound.value++;
      setTimeout(() => {
        selectNewTargetDepartment();
      }, 1000);
    }
  };
  
  const onDepartmentClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value) return;
    const layer = e.target as GeoJSONLayer;
    const clickedDepartment = layer.feature.properties.name;
    const departmentCode = layer.feature.properties.code ? 
      `(${layer.feature.properties.code})` : '';
    
    if (leafletMap.value) {
      L.popup({
        autoClose: true,
        closeButton: false,
        className: "wrong-department-popup",
      })
        .setLatLng(e.latlng)
        .setContent(`${clickedDepartment} ${departmentCode}`)
        .openOn(leafletMap.value as L.Map);
    }
    
    if (clickedDepartment === targetDepartment.value) {
      currentAttempts.value++;
      if (currentAttempts.value === 1) {
        score.value++;
      }
      showFeedback(true);
      if (geojsonLayer.value) {
        geojsonLayer.value.eachLayer((l) => {
          const geoL = l as GeoJSONLayer;
          if (geoL.feature?.properties?.name === clickedDepartment) {
            (l as L.Path).setStyle(getStyleForAttempts(currentAttempts.value));
          }
        });
      }
      foundDepartments.value.set(clickedDepartment, currentAttempts.value);
      if (currentRound.value === totalRoundsLocal.value) {
        setTimeout(endGame, 1000);
      } else {
        currentRound.value++;
        setTimeout(() => {
          selectNewTargetDepartment();
        }, 1000);
      }
    } else {
      currentAttempts.value++;
      if (currentAttempts.value >= 3 && geojsonLayer.value) {
        geojsonLayer.value.eachLayer((l) => {
          const geoL = l as GeoJSONLayer;
          if (geoL.feature?.properties?.name === targetDepartment.value) {
            (l as L.Path).setStyle(failedStyle);
            animateLayer(l);
          }
        });
        foundDepartments.value.set(targetDepartment.value, 4);
        showFeedback(false);
        if (currentRound.value === totalRoundsLocal.value) {
          setTimeout(endGame, 1000);
        } else {
          currentRound.value++;
          setTimeout(() => {
            selectNewTargetDepartment();
          }, 1000);
        }
      } else {
        showFeedback(false);
        if (geojsonLayer.value) {
          geojsonLayer.value.eachLayer((l) => {
            const geoL = l as GeoJSONLayer;
            if (geoL.feature?.properties?.name === clickedDepartment) {
              (l as L.Path).setStyle(selectedStyle);
            }
          });
        }
        setTimeout(() => {
          if (!foundDepartments.value.has(clickedDepartment) && geojsonLayer.value) {
            geojsonLayer.value.eachLayer((l) => {
              const geoL = l as GeoJSONLayer;
              if (geoL.feature?.properties?.name === clickedDepartment) {
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
    
    // Center the map on France
    const leafletMapInstance = L.map(map.value, {
      minZoom: 6,
      maxZoom: 10,
      worldCopyJump: false,
      center: [46.603354, 1.888334], // Center of France
      zoom: 6,
      maxBounds: [
        [41.3, -5.5], // Southwest corner
        [51.5, 9.5]   // Northeast corner
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
    
    // Use French department GeoJSON file
    fetch(
      "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements.geojson"
    )
      .then((response) => response.json())
      .then((data: unknown) => {
        if (isFeatureCollection(data)) {
          // Process GeoJSON data to extract department names
          const numberOfDepartments = data.features.length;
          totalRoundsLocal.value = Math.min(numberOfDepartments, props.totalRounds || numberOfDepartments);
          
          // Extract department names from GeoJSON
          availableDepartments.value = data.features
            .map((feature) => {
              const properties = feature.properties as { nom: string };
              return properties.nom;
            })
            .filter((name): name is string => name !== undefined);
          
          // Start with a random department
          selectNewTargetDepartment();
          
          // Create the GeoJSON layer
          geojsonLayer.value = L.geoJSON(data, {
            style: defaultStyle,
            onEachFeature: (feature, layer) => {
              // Assign the department name to the name property for consistency
              const properties = feature.properties as { nom: string; code: string };
              (feature.properties as GeoJSONFeature['properties']).name = properties.nom;
              (feature.properties as GeoJSONFeature['properties']).code = properties.code;
              
              layer.on({
                click: onDepartmentClick,
                mouseover: (e) => {
                  const geoLayer = e.target as GeoJSONLayer;
                  const departmentName = geoLayer.feature.properties.name;
                  if (!foundDepartments.value.has(departmentName)) {
                    geojsonLayer.value?.eachLayer((l) => {
                      const geoL = l as GeoJSONLayer;
                      if (geoL.feature?.properties?.name === departmentName) {
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
                  const departmentName = geoLayer.feature.properties.name;
                  if (!foundDepartments.value.has(departmentName)) {
                    geojsonLayer.value?.eachLayer((l) => {
                      const geoL = l as GeoJSONLayer;
                      if (geoL.feature?.properties?.name === departmentName) {
                        (l as L.Path).setStyle(defaultStyle);
                      }
                    });
                  }
                },
              });
            },
          }).addTo(leafletMapInstance);
        }
      })
      .catch(error => {
        console.error("Error loading French departments GeoJSON:", error);
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
  .target-department {
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
  .department-reveal-animation {
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
  .wrong-department-popup {
    font-weight: bold;
    color: var(--text-color);
    background: var(--header-bg);
    border: 1px solid var(--map-border-color);
    border-radius: 4px;
    padding: 4px 8px;
  }
  </style>