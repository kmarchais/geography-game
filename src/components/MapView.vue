<template>
  <div class="map-container">
    <div class="game-header">
      <template v-if="!gameEnded">
        <div class="game-info">
          <div class="score-display">
            Score: {{ score }}/{{ totalRounds }}
          </div>
          <div class="round-display">
            Round: {{ currentRound }}/{{ totalRounds }}
          </div>
          <div class="attempts-display">
            Attempts: {{ currentAttempts }}/3
          </div>
        </div>
        <div class="target-country">
          Find: {{ targetCountry }}
        </div>
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
            Final Score: {{ score }}/{{ totalRounds }}
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
import L from 'leaflet';
import { onMounted, ref } from 'vue';

// Define props for customizable game settings
const props = defineProps({
  totalRounds: {
    type: Number,
    default: 241
  }
});

const map = ref(null);
const selectedCountry = ref(null);
const geojsonLayer = ref(null);
const targetCountry = ref('');
const score = ref(0);
const currentRound = ref(1);
const feedback = ref('');
const feedbackType = ref('');
const gameEnded = ref(false);
const currentAttempts = ref(0);

const availableCountries = ref<string[]>([]);
const usedCountries = ref<string[]>([]);

const defaultStyle = {
  fillColor: '#333333',
  fillOpacity: 1,
  color: '#666666',
  weight: 1,
  opacity: 1
};

const firstAttemptStyle = {
  fillColor: '#2ecc71',  // Green
  fillOpacity: 1,
  color: '#666666',
  weight: 1,
  opacity: 1
};

const secondAttemptStyle = {
  fillColor: '#FFFF00',  // Yellow
  fillOpacity: 1,
  color: '#666666',
  weight: 1,
  opacity: 1
};

const thirdAttemptStyle = {
  fillColor: '#FFA500',  // Orange
  fillOpacity: 1,
  color: '#666666',
  weight: 1,
  opacity: 1
};

const failedStyle = {
  fillColor: '#FF0000',  // Red
  fillOpacity: 1,
  color: '#666666',
  weight: 1,
  opacity: 1
};

const selectedStyle = {
  fillOpacity: 0.7,
  weight: 2,
  opacity: 1
};

const foundCountries = ref(new Map());

const resetStyle = () => {
  if (selectedCountry.value && geojsonLayer.value) {
    geojsonLayer.value.resetStyle(selectedCountry.value);
  }
};

const selectNewTargetCountry = () => {
  const remainingCountries = availableCountries.value.filter(country => 
    !usedCountries.value.includes(country)
  );
  
  if (remainingCountries.length === 0) {
    usedCountries.value = [];
    const randomIndex = Math.floor(Math.random() * availableCountries.value.length);
    const newTarget = availableCountries.value[randomIndex];
    usedCountries.value.push(newTarget);
    targetCountry.value = newTarget;
  } else {
    const randomIndex = Math.floor(Math.random() * remainingCountries.length);
    const newTarget = remainingCountries[randomIndex];
    usedCountries.value.push(newTarget);
    targetCountry.value = newTarget;
  }
  
  currentAttempts.value = 0;
};

const getStyleForAttempts = (attempts: number) => {
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

const showFeedback = (isCorrect: boolean) => {
  feedbackType.value = isCorrect ? 'correct' : 'incorrect';
  if (isCorrect) {
    if (currentAttempts.value === 1) {
      feedback.value = 'Perfect! Well done!';
    } else {
      feedback.value = 'Correct!';
    }
  } else {
    feedback.value = currentAttempts.value === 3 
      ? `Out of attempts! The correct country was ${targetCountry.value}`
      : `Wrong! Try again to find ${targetCountry.value}`;
  }
  
  setTimeout(() => {
    feedback.value = '';
    feedbackType.value = '';
  }, 2000);
};

const endGame = () => {
  gameEnded.value = true;
};

const startNewGame = () => {
  score.value = 0;
  currentRound.value = 1;
  currentAttempts.value = 0;
  gameEnded.value = false;
  usedCountries.value = [];
  foundCountries.value.clear();
  selectNewTargetCountry();
  
  if (geojsonLayer.value) {
    geojsonLayer.value.eachLayer((layer) => {
      layer.setStyle(defaultStyle);
    });
  }
};

const onCountryClick = (e) => {
  if (gameEnded.value) return;
  
  const layer = e.target;
  const clickedCountry = layer.feature.properties.name;
  
  if (clickedCountry === targetCountry.value) {
    currentAttempts.value++;
    
    // Only increment score on first attempt
    if (currentAttempts.value === 1) {
      score.value++;
    }
    
    showFeedback(true);
    
    // Store country with number of attempts and apply appropriate style
    foundCountries.value.set(clickedCountry, currentAttempts.value);
    layer.setStyle(getStyleForAttempts(currentAttempts.value));
    
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
    
    if (currentAttempts.value >= 3) {
      // Mark target country as failed after 3 attempts
      geojsonLayer.value.eachLayer((l) => {
        if (l.feature.properties.name === targetCountry.value) {
          l.setStyle(failedStyle);
          foundCountries.value.set(targetCountry.value, 4); // 4 indicates failure
        }
      });
      
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
      // Temporarily highlight wrong selection
      layer.setStyle(selectedStyle);
      setTimeout(() => {
        if (!foundCountries.value.has(clickedCountry)) {
          layer.setStyle(defaultStyle);
        }
      }, 1000);
    }
  }
};

onMounted(() => {
  const leafletMap = L.map(map.value, {
    minZoom: 2,
    worldCopyJump: true,
  }).setView([20, 0], 2);

  fetch('https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson')
    .then(response => response.json())
    .then(data => {
      availableCountries.value = data.features
        .map(feature => feature.properties.name)
        .filter(name => name && name.trim() !== ''); // Filter out any empty names
      
      selectNewTargetCountry();
      
      geojsonLayer.value = L.geoJSON(data, {
        style: defaultStyle,
        onEachFeature: (feature, layer) => {
          layer.on({
            click: onCountryClick,
            mouseover: (e) => {
              const layer = e.target;
              const countryName = layer.feature.properties.name;
              if (!foundCountries.value.has(countryName)) {
                layer.setStyle({
                  ...defaultStyle,
                  fillOpacity: 0.7
                });
              }
            },
            mouseout: (e) => {
              const layer = e.target;
              const countryName = layer.feature.properties.name;
              if (!foundCountries.value.has(countryName)) {
                layer.setStyle(defaultStyle);
              }
            }
          });
        }
      }).addTo(leafletMap);
    });
});
</script>

<style>
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
  background-color: rgba(51, 51, 51, 0.9);
  padding: 15px;
  border-radius: 8px;
  min-width: 200px;
}

.game-info {
  display: flex;
  gap: 20px;
  color: white;
  font-size: 18px;
}

.target-country {
  color: white;
  font-size: 20px;
  font-weight: bold;
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
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
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
  background-color: #2f343a !important;
  overflow: hidden;
}

.leaflet-popup-content {
  background-color: #333333;
  color: #ffffff;
}

.leaflet-popup-tip {
  background-color: #333333;
}

/* Hide all Leaflet controls */
.leaflet-control-container .leaflet-top,
.leaflet-control-container .leaflet-bottom {
  display: none;
}
</style>