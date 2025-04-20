<template>
    <div class="map-container">
      <!-- Game Header -->
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
          </div>
          <div class="target-entity">
            Find: {{ targetEntity }}
          </div>
          <button
            class="skip-btn"
            @click="handleSkip"
            :disabled="!!feedback"
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
              Final Score: {{ score }}/{{ totalRoundsComputed }}
              <div class="final-time">
                Time: {{ formattedTime }}
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
  
      <!-- Map Div -->
      <div
        ref="mapElement"
        class="map-render-area"
      />
  
      <!-- Slot for additional controls like France's overseas nav -->
      <div class="extra-controls-container">
        <slot name="extra-controls" :map="leafletMap"></slot>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import type { FeatureCollection } from "geojson";
  import L from "leaflet";
  import "leaflet/dist/leaflet.css"; // Import Leaflet CSS
  import {
    computed,
    onMounted,
    onUnmounted, // Ensure onUnmounted is imported
    ref,
    watch,
    type Ref,
    shallowRef,
  } from "vue";
  import { useTheme } from "vuetify";
  import { useMapGameLogic } from "../composables/useMapGameLogic"; // Adjust path if needed
  import {
    animateLayer,
    defaultStyle, // Make sure defaultStyle is imported
    failedStyle,
    getStyleForAttempts,
    isFeatureCollection,
    selectedStyle,
    type GeoJSONFeature,
    type GeoJSONLayer,
    type GeoJSONProperties,
  } from "../utils/geojsonUtils"; // Adjust path if needed
  
  // --- Props ---
  
  interface MapOptions extends L.MapOptions {
    initialCenter: L.LatLngExpression;
    initialZoom: number;
  }
  
  type ProcessGeoJsonFunc = (
    data: FeatureCollection<any, any>
  ) => FeatureCollection<any, GeoJSONProperties>; // Should return standardized properties
  type AddManualMarkersFunc = (
    map: L.Map,
    available: Ref<string[]>,
    found: Ref<Map<string, number>>,
    clickHandler: (name: string, latlng: L.LatLng) => void
  ) => void; // Function to add non-geojson markers
  
  const props = defineProps<{
    // Game Identification
    entityNameSingular: string;
    entityNamePlural: string;
  
    // Data Source and Processing
    geojsonUrl: string;
    geojsonNameProperty: string; // e.g., 'name', 'nom'
    geojsonCodeProperty?: string; // Optional e.g., 'code'
    totalRoundsOverride?: number; // If not based on feature count
    processGeojsonDataFn?: ProcessGeoJsonFunc; // For complex processing like world wrap
    addManualMarkersFn?: AddManualMarkersFunc; // For adding markers like French territories
  
    // Map Configuration
    mapOptions: MapOptions;
  }>();
  
  // --- Refs ---
  const mapElement = ref<HTMLElement | null>(null);
  const leafletMap = shallowRef<L.Map | null>(null); // Use shallowRef for Leaflet instance
  const tileLayer = shallowRef<L.TileLayer | null>(null);
  const geojsonLayer = shallowRef<L.GeoJSON | null>(null);
  const availableEntities = ref<string[]>([]);
  const totalRoundsComputed = ref(0); // Calculated total rounds
  
  // --- Composables ---
  const theme = useTheme();
  const gameLogic = useMapGameLogic({
    entityNameSingular: props.entityNameSingular,
    entityNamePlural: props.entityNamePlural,
    availableEntities: availableEntities,
    totalRounds: totalRoundsComputed,
  });
  // Expose game logic state/methods for template
  const {
    score,
    currentRound,
    currentAttempts,
    gameEnded,
    targetEntity,
    foundEntities,
    timer,
    formattedTime,
    feedback,
    feedbackType,
    startNewGame,
    skipEntity,
    handleCorrectGuess,
    handleIncorrectGuess,
  } = gameLogic;
  
  // --- Map and Layer Styling ---
  
  // Function to set style for a specific layer
  const setLayerStyle = (layer: L.Layer, style: L.PathOptions) => {
    // Check if the layer still exists and has setStyle method
    if (layer && typeof (layer as L.Path).setStyle === 'function') {
        (layer as L.Path).setStyle(style);
    } else {
        // This can happen if the layer was removed during an async operation (like the timeout)
        // console.warn("Attempted to set style on an invalid or removed layer.");
    }
  };
  
  // Function to update the style of all GeoJSON layers based on game state
  const updateAllLayerStyles = () => {
    if (!geojsonLayer.value) return;
    // console.log("Updating all layer styles based on:", foundEntities.value); // Debug log
  
    geojsonLayer.value.eachLayer((layer) => {
      const geoLayer = layer as GeoJSONLayer;
      // Ensure feature and properties exist before trying to access name
      const entityName = geoLayer.feature?.properties?.name;
  
      if (entityName) {
        const attempts = foundEntities.value.get(entityName);
        const styleToApply = getStyleForAttempts(attempts); // Will return defaultStyle if attempts is undefined
        // console.log(`  Applying style to ${entityName} (attempts: ${attempts}):`, styleToApply); // Optional detailed log
        setLayerStyle(layer, styleToApply);
      } else {
        // Apply default style if layer has no name (shouldn't happen ideally)
        setLayerStyle(layer, defaultStyle);
      }
    });
  
    // --- IMPORTANT FOR MANUAL MARKERS ---
    // If you have manual markers (like French Territories), their styling
    // also needs to be updated here or triggered by this watcher.
    // The current `addFrenchTerritoryMarkers` function in FrenchDepartmentsGame.vue
    // already includes its own watcher for `found` which should handle this.
    // If manual markers in other games need updating, add logic here or ensure
    // their setup function includes a similar watcher.
    // console.log("Finished updating all layer styles."); // Debug log
  };
  
  
  // --- Event Handlers ---
  
  const onEntityClick = (e: L.LeafletMouseEvent) => {
    if (gameEnded.value || feedback.value) return; // Prevent clicks during feedback/end
  
    const layer = e.target as GeoJSONLayer;
    // Ensure feature and properties exist before proceeding
    if (!layer.feature?.properties) {
        console.warn("Clicked layer is missing feature properties:", layer);
        return;
    }
    const clickedEntityName = layer.feature.properties.name; // Standardized name
    const clickedEntityCode = layer.feature.properties.code; // Standardized code
  
    if (!clickedEntityName) {
      console.warn("Clicked feature has no name property:", layer.feature);
      return;
    }
  
    // Show popup with name (and code if available)
    if (leafletMap.value) {
      const popupContent = clickedEntityCode
        ? `${clickedEntityName} (${clickedEntityCode})`
        : clickedEntityName;
      L.popup({
        autoClose: true,
        closeButton: false,
        className: "entity-popup", // Use a generic class
      })
        .setLatLng(e.latlng)
        .setContent(popupContent)
        .openOn(leafletMap.value);
    }
  
    if (clickedEntityName === targetEntity.value) {
      handleCorrectGuess(clickedEntityName);
      // Style is updated via watch(foundEntities)
    } else {
      // Incorrect guess
      const { shouldEndRound } = handleIncorrectGuess(clickedEntityName);
      if (!shouldEndRound) {
        // Temporarily highlight the wrong guess
        setLayerStyle(layer, selectedStyle);
        setTimeout(() => {
          // Check if the layer still exists on the map before resetting style
          // This check is important because the map might have changed (e.g., navigated away)
          // or the layer itself might have been removed by another process.
          if (leafletMap.value?.hasLayer(layer)) {
              // Reset style only if it hasn't been correctly identified or failed in the meantime
              if (!foundEntities.value.has(clickedEntityName)) {
                  setLayerStyle(layer, defaultStyle);
              } else {
                  // If it was found/failed while popup was showing, set correct style
                  setLayerStyle(
                      layer,
                      getStyleForAttempts(foundEntities.value.get(clickedEntityName))
                  );
              }
          }
        }, 1000); // Duration of temporary highlight
      } else {
        // Round ended due to max attempts, animate the correct one
        highlightTargetEntity(targetEntity.value);
      }
    }
  };
  
  // Specific handler for manual markers (passed to addManualMarkersFn)
  const onManualMarkerClick = (name: string, latlng: L.LatLng) => {
    if (gameEnded.value || feedback.value) return;
  
    // Show popup (assuming code might not be available or handled differently)
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
  
    if (name === targetEntity.value) {
      handleCorrectGuess(name);
      // Manual marker styling needs to be handled by the addManualMarkersFn implementation
      // or by watching foundEntities within that function's scope.
    } else {
      const { shouldEndRound } = handleIncorrectGuess(name);
      if (shouldEndRound) {
        // Animate the correct one (could be GeoJSON or another marker)
        highlightTargetEntity(targetEntity.value);
      }
      // No temporary highlight for markers unless implemented in addManualMarkersFn
    }
  };
  
  const handleSkip = () => {
    const { skippedEntity } = skipEntity();
    if (skippedEntity) { // Only highlight if skip was successful (game not ended)
        highlightTargetEntity(skippedEntity);
    }
  };
  
  const handleNewGame = () => {
    startNewGame();
    updateAllLayerStyles(); // Reset all styles
    // Reset manual marker styles if applicable (needs logic in addManualMarkersFn)
  };
  
  // Helper to find and animate the target entity layer
  const highlightTargetEntity = (entityNameToHighlight: string) => {
    if (!geojsonLayer.value || !entityNameToHighlight) return;
    let layerFound = false;
    geojsonLayer.value.eachLayer((l) => {
      const geoL = l as GeoJSONLayer;
      if (geoL.feature?.properties?.name === entityNameToHighlight) {
        // Style will be updated by the watcher, just animate
        animateLayer(l);
        layerFound = true;
      }
    });
    if (!layerFound) {
      // Potentially trigger animation for a manual marker if applicable
      console.warn(`Layer for ${entityNameToHighlight} not found to animate.`);
      // Add logic here if manual markers need animation triggered differently
    }
  };
  
  // --- Lifecycle Hooks ---
  
  onMounted(async () => {
    if (!mapElement.value) {
      console.error("Map container element not found.");
      return;
    }
  
    // Initialize Leaflet Map
    const map = L.map(mapElement.value, {
      ...props.mapOptions, // Spread base options
      center: props.mapOptions.initialCenter,
      zoom: props.mapOptions.initialZoom,
    });
    leafletMap.value = map;
  
    // Add Tile Layer
    const currentTheme = theme.global.name.value;
    tileLayer.value = L.tileLayer(
      `https://{s}.basemaps.cartocdn.com/${currentTheme}_nolabels/{z}/{x}/{y}{r}.png`,
      {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>', // Recommended attribution
        noWrap: !props.mapOptions.worldCopyJump, // NoWrap should be false if worldCopyJump is true
      }
    ).addTo(map);
  
    // Set initial theme attribute
    document.documentElement.setAttribute("data-theme", currentTheme);
  
    // Fetch and process GeoJSON data
    try {
      const response = await fetch(props.geojsonUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      let data = await response.json();
  
      // 1. Standardize Properties (Name, Code)
      if (isFeatureCollection(data)) {
        data.features.forEach((feature: any) => {
          if (!feature.properties) {
            feature.properties = {};
          }
          // Ensure the name property exists before assigning
          if (props.geojsonNameProperty in feature.properties) {
              feature.properties.name = feature.properties[props.geojsonNameProperty];
          } else {
              console.warn(`Feature missing expected name property '${props.geojsonNameProperty}':`, feature);
              feature.properties.name = 'Unknown'; // Assign a default or handle error
          }
  
          if (props.geojsonCodeProperty && props.geojsonCodeProperty in feature.properties) {
            feature.properties.code =
              feature.properties[props.geojsonCodeProperty];
          }
        });
  
        // 2. Apply Custom Processing (e.g., world wrap, filtering)
        let processedData = props.processGeojsonDataFn
          ? props.processGeojsonDataFn(data)
          : data;
  
        if (isFeatureCollection(processedData)) {
          // 3. Extract Available Entity Names (Filter out 'Unknown' names added above)
          availableEntities.value = processedData.features
            .map((feature) => feature.properties?.name)
            .filter((name): name is string => typeof name === "string" && name.trim() !== "" && name !== 'Unknown');
  
          if (availableEntities.value.length === 0) {
             console.error("No entities with valid names found in GeoJSON after processing.");
             targetEntity.value = "Error: No entities loaded"; // Use targetEntity to display error
             return;
          }
  
          // 4. Determine Total Rounds
          totalRoundsComputed.value =
            props.totalRoundsOverride ?? availableEntities.value.length;
  
          // 5. Add GeoJSON Layer to Map
          geojsonLayer.value = L.geoJSON(processedData, {
            style: defaultStyle,
            onEachFeature: (feature, layer) => {
              // Only add handlers if the feature has a valid name
              if (feature.properties?.name && feature.properties.name !== 'Unknown') {
                  layer.on({
                    click: onEntityClick,
                    mouseover: (e) => {
                      const geoLayer = e.target as GeoJSONLayer;
                      const entityName = geoLayer.feature.properties.name;
                      if (entityName && !foundEntities.value.has(entityName)) {
                        setLayerStyle(layer, { ...defaultStyle, fillOpacity: 0.7 });
                      }
                    },
                    mouseout: (e) => {
                      const geoLayer = e.target as GeoJSONLayer;
                      const entityName = geoLayer.feature.properties.name;
                      if (entityName && !foundEntities.value.has(entityName)) {
                        // Check if layer still exists before setting style
                        if (leafletMap.value?.hasLayer(layer)) {
                            setLayerStyle(layer, defaultStyle);
                        }
                      }
                    },
                  });
              }
            },
            // Filter out features that ended up with 'Unknown' name during processing
            filter: (feature) => {
                return feature.properties?.name !== 'Unknown';
            }
          }).addTo(map);
  
          // 6. Add Manual Markers (if function provided)
          if (props.addManualMarkersFn) {
            props.addManualMarkersFn(
              map,
              availableEntities,
              foundEntities,
              onManualMarkerClick
            );
            // Recalculate total rounds if manual markers added to availableEntities
             totalRoundsComputed.value =
               props.totalRoundsOverride ?? availableEntities.value.length;
          }
  
          // 7. Start the Game
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
      targetEntity.value = "Error loading map data"; // Display error
    }
  });
  
  onUnmounted(() => {
    // Timer cleanup is handled by onScopeDispose in useMapGameLogic
  
    // Clean up Leaflet map instance robustly
    if (leafletMap.value) {
      try {
        console.log("Attempting to remove Leaflet map instance on unmount.");
        leafletMap.value.remove();
        console.log("Leaflet map instance removed successfully.");
      } catch (mapError) {
        console.error("Error removing Leaflet map during unmount:", mapError);
      } finally {
        leafletMap.value = null;
      }
    } else {
      console.log("Leaflet map instance was already null during unmount.");
    }
  });
  
  // --- Watchers ---
  
  // Watch for theme changes
  watch(
    () => theme.global.name.value,
    (newTheme) => {
      document.documentElement.setAttribute("data-theme", newTheme);
      // Update tile layer URL
      if (tileLayer.value) {
        tileLayer.value.setUrl(
          `https://{s}.basemaps.cartocdn.com/${newTheme}_nolabels/{z}/{x}/{y}{r}.png`
        );
      }
      // Update GeoJSON styles based on the current foundEntities map
      updateAllLayerStyles();
      // Update manual marker styles if needed (requires logic within addManualMarkersFn or separate watcher)
    }
  );
  
  // Watch for changes in foundEntities to update styles
  watch(
    foundEntities,
    (currentFoundEntities) => {
      // console.log("Watcher triggered for foundEntities:", currentFoundEntities); // Debug log
      // Update styles whenever the foundEntities map changes
      updateAllLayerStyles();
    },
    { deep: true } // Still need deep: true for watching Map changes
  );
  </script>
  
  <style>
  /* General Styles (can be moved to a global CSS file) */
  :root {
    color-scheme: light dark;
    --header-bg: rgba(255, 255, 255, 0.9);
    --text-color: #333333;
    --map-default-fill: #f0f0f0;
    --map-border-color: #cccccc;
    --map-bg: #ffffff;
    --popup-bg: var(--header-bg);
    --popup-text: var(--text-color);
    --popup-border: var(--map-border-color);
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
  
  /* Component Styles */
  .map-container {
    position: relative;
    width: 100%;
    height: 100vh; /* Or desired height */
    display: flex; /* Use flexbox to manage layout */
    flex-direction: column; /* Stack header/map vertically */
    overflow: hidden; /* Prevent potential scrollbars from map */
  }
  
  .map-render-area {
    flex-grow: 1; /* Map takes remaining space */
    width: 100%;
    background-color: var(--map-bg); /* Ensure map bg matches theme */
  }
  
  .game-header {
    position: absolute;
    top: 10px; /* Adjust as needed */
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000; /* Above map */
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px; /* Reduced gap */
    background-color: var(--header-bg);
    padding: 10px 15px; /* Adjusted padding */
    border-radius: 8px;
    min-width: 250px; /* Adjust as needed */
    max-width: 90%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }
  
  .game-info {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
    justify-content: center;
    gap: 15px; /* Adjust gap */
    color: var(--text-color);
    font-size: clamp(0.8rem, 2.5vw, 1rem); /* Responsive font size */
  }
  
  .target-entity {
    color: var(--text-color);
    font-size: clamp(1rem, 3vw, 1.25rem); /* Responsive font size */
    font-weight: bold;
    text-align: center;
  }
  
  .skip-btn,
  .new-game-btn {
    color: white;
    border: none;
    padding: 6px 12px; /* Adjusted padding */
    border-radius: 4px;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem); /* Responsive font size */
    cursor: pointer;
    transition: background-color 0.2s;
    margin-top: 5px; /* Reduced margin */
  }
  .skip-btn:disabled {
    background-color: #aaa;
    cursor: not-allowed;
  }
  
  .skip-btn {
    background-color: #e67e22;
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
    font-weight: bold;
    color: white;
    text-align: center;
    font-size: clamp(0.8rem, 2.5vw, 0.9rem);
  }
  
  .feedback.correct {
    background-color: rgba(75, 181, 67, 0.9); /* Green */
  }
  
  .feedback.incorrect {
    background-color: rgba(181, 67, 67, 0.9); /* Red */
  }
  
  .game-end {
    text-align: center;
  }
  
  .final-score {
    color: var(--text-color);
    font-size: clamp(1.2rem, 4vw, 1.5rem);
    font-weight: bold;
    margin-bottom: 10px;
  }
  
  .final-time {
    font-size: clamp(0.9rem, 3vw, 1.1rem);
    margin-top: 5px;
    color: var(--text-color);
  }
  
  /* Leaflet Customizations */
  .leaflet-container {
    background-color: var(--map-bg) !important; /* Override default Leaflet bg */
    font-family: inherit; /* Inherit font from body */
  }
  
  /* Generic Popup Style */
  .entity-popup .leaflet-popup-content-wrapper {
    background: var(--popup-bg);
    color: var(--popup-text);
    border: 1px solid var(--popup-border);
    border-radius: 4px;
    box-shadow: none;
  }
  
  .entity-popup .leaflet-popup-content {
    margin: 8px 10px; /* Adjust padding inside popup */
    font-size: 0.9rem;
    font-weight: bold;
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
  
  /* Hide default zoom controls if not needed */
  .leaflet-control-container .leaflet-top,
  .leaflet-control-container .leaflet-bottom {
    /* display: none; */ /* Uncomment to hide */
  }
  
  /* Animation */
  .entity-reveal-animation {
    /* Use the CSS variable --target-scale set in JS */
    animation: highlight-pulse 1.5s ease-in-out;
  }
  
  @keyframes highlight-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px rgba(255, 0, 0, 0.7));
    }
    50% {
      transform: scale(var(--target-scale, 1.5)); /* Default scale if var not set */
      filter: drop-shadow(0 0 25px rgba(255, 0, 0, 0.9)); /* More prominent shadow */
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0px rgba(255, 0, 0, 0.7));
    }
  }
  
  /* Container for extra controls (like France overseas nav) */
  .extra-controls-container {
    position: absolute;
    bottom: 20px; /* Example position */
    right: 10px;  /* Example position */
    z-index: 1000; /* Above map */
  }
  
  /* Example style for French overseas nav if placed in slot */
  .overseas-navigation {
    background-color: var(--header-bg);
    padding: 8px;
    border-radius: 6px;
    box-shadow: 0 1px 5px rgba(0,0,0,0.2);
    max-width: 180px; /* Adjust */
    opacity: 0.9;
    transition: opacity 0.3s;
  }
  .overseas-navigation:hover {
    opacity: 1;
  }
  .overseas-title {
    color: var(--text-color);
    font-weight: bold;
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
    flex: 1 0 calc(50% - 4px); /* Two buttons per row */
    background-color: #4a90e2;
    color: white;
    border: none;
    padding: 4px;
    border-radius: 4px;
    font-size: 11px;
    cursor: pointer;
    transition: background-color 0.2s;
    text-align: center;
  }
  .overseas-btn:hover {
    background-color: #357abd;
  }
  
  /* Example style for manual territory markers */
  .territory-marker .territory-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px; /* Adjust size */
    height: 30px; /* Adjust size */
    border-radius: 50%;
    border: 2px solid #d35400; /* Default border */
    background-color: var(--header-bg);
    color: var(--text-color);
    font-weight: bold;
    font-size: 10px; /* Adjust font size */
    text-align: center;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    cursor: pointer;
  }
  /* Add styles for different states (correct, failed) within addManualMarkersFn if needed */
  
  </style>
  