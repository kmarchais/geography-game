<template>
  <div class="map-container">
    <div class="game-header">
      <template v-if="!gameEnded">
        <div class="game-info">
          <div class="score-display">
            Score: {{ score }}/{{ totalRoundsLocal }}
          </div>
          <div class="round-display">
            Round: {{ currentRound }}/{{ totalRoundsLocal }}
          </div>
          <div class="attempts-display">
            Attempts: {{ currentAttempts }}/3
          </div>
          <div class="timer-display">
            Time: {{ formattedTime }}
          </div>
        </div>
        <div class="target-department">
          Find: {{ targetDepartment }}</div>
        <button
          class="skip-btn"
          @click="skipDepartment"
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
            Final Score: {{ score }}/{{ totalRoundsLocal }}
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
      ref="map"
      style="height: calc(100vh - 64px); width: 100%"
    />
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

// Let's define function types to avoid errors
type NavigateToDepFn = (departmentName: string) => void;

// This will be our actual implementation function, correctly typed
let navigateToTargetDepartment: NavigateToDepFn = () => {}; // Empty placeholder initially

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

  // Navigate to the department after a short delay
  setTimeout(() => {
    navigateToTargetDepartment(targetDepartment.value);
  }, 300);
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

// Implement the navigation function
navigateToTargetDepartment = (departmentName: string) => {
  if (!geojsonLayer.value || !leafletMap.value) return;

  // Find the target department's coordinates
  let targetLat = 0;
  let targetLng = 0;
  let foundTarget = false;

  geojsonLayer.value.eachLayer((l) => {
    const geoL = l as GeoJSONLayer;
    if (geoL.feature?.properties?.name === departmentName) {
      // Get the center of the department using layer bounds
      if ('getBounds' in l) {
        const boundsGetter = l as unknown as { getBounds(): L.LatLngBounds };
        const bounds = boundsGetter.getBounds();
        targetLat = bounds.getCenter().lat;
        targetLng = bounds.getCenter().lng;
        foundTarget = true;
      }
    }
  });

  if (foundTarget) {
    // Special case for overseas departments - zoom in more and center map
    if (targetLng < -20 || targetLng > 10 || targetLat < 40 || targetLat > 52) { // Outside mainland France
      leafletMap.value.setView([targetLat, targetLng], 8);
    } else if (leafletMap.value.getZoom() < 5) {
      // If we're zoomed out too much, zoom in on mainland France
      leafletMap.value.setView([46.603354, 1.888334], 5);
    }
  }
};
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
            (l as L.Path).setStyle(defaultStyle);
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

  // Center the map on France, without navigation constraints
  const leafletMapInstance = L.map(map.value, {
    minZoom: 2,
    maxZoom: 10,
    worldCopyJump: true,
    center: [46.603354, 1.888334], // Center of France
    zoom: 5,
    // Removed maxBounds entirely to allow unlimited panning
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

  // Add UI controls for easy navigation to overseas territories
  // Need to use a different approach to create a control that's TypeScript-friendly
  const overseasControl = new L.Control({ position: 'bottomright' });
  overseasControl.onAdd = function() {
    const div = L.DomUtil.create('div', 'overseas-navigation');
    div.innerHTML = `
      <div class="overseas-title">Territories</div>
      <div class="overseas-buttons">
        <button class="overseas-btn" data-region="mainland">Mainland</button>
        <button class="overseas-btn" data-region="caribbean">Caribbean</button>
        <button class="overseas-btn" data-region="guiana">Guiana</button>
        <button class="overseas-btn" data-region="reunion">Réunion</button>
        <button class="overseas-btn" data-region="mayotte">Mayotte</button>
        <button class="overseas-btn" data-region="stpierre">St. Pierre</button>
        <button class="overseas-btn" data-region="polynesia">Polynesia</button>
        <button class="overseas-btn" data-region="newcaledonia">New Caledonia</button>
        <button class="overseas-btn" data-region="antarctic">Antarctic</button>
        <button class="overseas-btn" data-region="clipperton">Clipperton</button>
        <button class="overseas-btn" data-region="all">World View</button>
      </div>
    `;

    // Add click handlers for the navigation buttons
    div.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('overseas-btn')) {
        const region = target.getAttribute('data-region');
        switch(region) {
          case 'mainland':
            leafletMapInstance.setView([46.603354, 1.888334], 5);
            break;
          case 'caribbean':
            leafletMapInstance.setView([16.0, -61.5], 8); // Guadeloupe/Martinique
            break;
          case 'guiana':
            leafletMapInstance.setView([4.0, -53.0], 7); // French Guiana
            break;
          case 'reunion':
            leafletMapInstance.setView([-21.1, 55.5], 9); // Réunion
            break;
          case 'mayotte':
            leafletMapInstance.setView([-12.8, 45.2], 10); // Mayotte
            break;
        }
      }
    });

    return div;
  };
  overseasControl.addTo(leafletMapInstance);

  // Use extended French territories GeoJSON file - combining departments with additional territories
  const fetchData = async () => {
    try {
      // First fetch the departments GeoJSON
      const deptResponse = await fetch(
        "https://raw.githubusercontent.com/gregoiredavid/france-geojson/master/departements-avec-outre-mer.geojson"
      );
      const deptData = await deptResponse.json();

      // Try to fetch additional territories - note: we'll use a custom URL or fallback to departments if not available
      try {
        // This will need to be replaced with the actual URL to your additional territories GeoJSON
        // For now, we'll use a placeholder that will likely fail, and we'll handle this gracefully
        const additionalResponse = await fetch(
          "https://raw.githubusercontent.com/your-repo/french-additional-territories.geojson"
        );

        if (additionalResponse.ok) {
          const additionalData = await additionalResponse.json();

          // Combine both datasets if additional data was successfully fetched
          if (isFeatureCollection(deptData) && isFeatureCollection(additionalData)) {
            const combinedData = {
              type: "FeatureCollection",
              features: [...deptData.features, ...additionalData.features]
            };
            processGeoJSONData(combinedData);
          } else {
            processGeoJSONData(deptData);
          }
        } else {
          // If additional territories fetch fails, just use departments
          processGeoJSONData(deptData);
          console.warn("Could not load additional territories GeoJSON, using departments only");

          // Add manual entries for the non-department territories to display in the UI
          addManualTerritories();
        }
      } catch {
        // If additional territories fetch fails, just use departments
        processGeoJSONData(deptData);
        console.warn("Could not load additional territories GeoJSON, using departments only");

        // Add manual entries for the non-department territories to display in the UI
        addManualTerritories();
      }
    } catch (error) {
      console.error("Error loading French territories GeoJSON:", error);
    }
  };

  // Function to process the GeoJSON data once obtained
  const processGeoJSONData = (data: unknown) => {
    if (isFeatureCollection(data)) {
      // Process GeoJSON data to extract department/territory names
      const numberOfTerritories = data.features.length;
      totalRoundsLocal.value = 109; // Math.min(numberOfTerritories, props.totalRounds || numberOfTerritories);

      // Log the available territories for debugging
      console.log(`Loaded ${numberOfTerritories} French territories, including overseas territories`);

      // Extract territory names from GeoJSON
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
          (feature.properties as GeoJSONFeature['properties']).code = properties.code || '';

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
  };

  // Function to add manual territory markers when we don't have precise GeoJSON data
  const addManualTerritories = () => {
    // Add additional territories as markers with clickable popups
    const additionalTerritories = [
      { name: "Saint Pierre et Miquelon", lat: 46.78, lng: -56.17, code: "975" },
      { name: "Polynésie Française", lat: -17.68, lng: -149.45, code: "987" },
      { name: "Nouvelle-Calédonie", lat: -21.25, lng: 165.5, code: "988" },
      { name: "Wallis et Futuna", lat: -13.77, lng: -177.15, code: "986" },
      { name: "Terres Australes et Antarctiques Françaises", lat: -49.35, lng: 70.22, code: "984" },
      { name: "Saint-Martin", lat: 18.08, lng: -63.05, code: "978" },
      { name: "Saint-Barthélemy", lat: 17.9, lng: -62.83, code: "977" },
      { name: "Île de Clipperton", lat: 10.28, lng: -109.22, code: "000" }
    ];

    const markers: Record<string, L.Marker> = {};
    const markerLayer = L.layerGroup().addTo(leafletMapInstance);

    // Function to update marker appearance based on game state
    const updateMarkerStyle = (territoryName: string) => {
      if (!markers[territoryName]) return;

      const marker = markers[territoryName];
      let color = '#d35400'; // Default border color
      let bgColor = 'var(--header-bg)';

      // If this territory has been found or attempted, change its color
      if (foundDepartments.value.has(territoryName)) {
        const attempts = foundDepartments.value.get(territoryName);
        switch (attempts) {
          case 1:
            color = '#2ecc71'; // Green for first attempt
            bgColor = '#2ecc71';
            break;
          case 2:
            color = '#FFFF00'; // Yellow for second attempt
            bgColor = '#FFFF00';
            break;
          case 3:
            color = '#FFA500'; // Orange for third attempt
            bgColor = '#FFA500';
            break;
          default:
            color = '#FF0000'; // Red for failed attempts
            bgColor = '#FF0000';
        }
      }

      // Create new icon with updated style
      const newIcon = L.divIcon({
        className: 'territory-marker',
        html: `<div class="territory-icon" style="border-color:${color}; background-color:${bgColor};">${territoryName.slice(0, 3)}</div>`,
        iconSize: [40, 40]
      });

      marker.setIcon(newIcon);
    };

    additionalTerritories.forEach(territory => {
      // Add the territory to the available departments list
      if (!availableDepartments.value.includes(territory.name)) {
        availableDepartments.value.push(territory.name);
      }

      // Create a marker with a clickable popup - now showing territory code
      const marker = L.marker([territory.lat, territory.lng], {
        icon: L.divIcon({
          className: 'territory-marker',
          html: `<div class="territory-icon" title="${territory.name}">${territory.code}</div>`,
          iconSize: [40, 40]
        })
      }).addTo(markerLayer);

      // Store marker reference for later style updates
      markers[territory.name] = marker;

      // Add click handler to the marker
      marker.on('click', (e) => {
        if (gameEnded.value) return;

        const clickedName = territory.name;
        if (leafletMap.value) {
          L.popup({
            autoClose: true,
            closeButton: false,
            className: "wrong-department-popup",
          })
            .setLatLng(e.latlng)
            .setContent(`${clickedName} (${territory.code})`)
            .openOn(leafletMap.value as L.Map);
        }

        if (clickedName === targetDepartment.value) {
          currentAttempts.value++;
          if (currentAttempts.value === 1) {
            score.value++;
          }
          showFeedback(true);

          // Update marker style to match the attempt count
          foundDepartments.value.set(clickedName, currentAttempts.value);
          updateMarkerStyle(clickedName);

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
          if (currentAttempts.value >= 3) {
            // Show where the correct target was
            foundDepartments.value.set(targetDepartment.value, 4);

            // If the target department was a marker, update its style
            if (markers[targetDepartment.value]) {
              updateMarkerStyle(targetDepartment.value);
            }

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
          }
        }
      });
    });

    // Watch for changes to foundDepartments to update marker styles
    watch(foundDepartments, () => {
      for (const territory of additionalTerritories) {
        if (foundDepartments.value.has(territory.name)) {
          updateMarkerStyle(territory.name);
        }
      }
    });
  };

  // Execute data loading
  fetchData();
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
  max-width: 80%;
  margin-bottom: 10px;
}
.game-info {
  display: flex;
  gap: 20px;
  color: var(--text-color);
  font-size: 18px;
}
.overseas-navigation {
  background-color: var(--header-bg);
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 1px 5px rgba(0,0,0,0.2);
  max-width: 200px;
  opacity: 0.9;
  transition: opacity 0.3s;
}

.overseas-navigation:hover {
  opacity: 1;
}
.overseas-title {
  color: var(--text-color);
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 8px;
  text-align: center;
}
.overseas-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.overseas-btn {
  flex: 1 0 calc(50% - 4px);
  background-color: #4a90e2;
  color: white;
  border: none;
  padding: 5px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: center;
}

.overseas-btn:hover {
  background-color: #357abd;
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
