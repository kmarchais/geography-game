<template>
  <div class="city-districts">
    <div
      v-if="!selectedCity"
      class="city-selection"
    >
      <div class="selection-header">
        <h1>City Districts</h1>
        <p>Choose a city to explore its districts</p>
      </div>
      <div class="city-options">
        <div
          class="city-option"
          @click="selectCity('paris')"
        >
          <div class="option-icon">
            🗼
          </div>
          <h2>Paris</h2>
          <p>Find the 20 arrondissements</p>
        </div>
        <div
          class="city-option"
          @click="selectCity('london')"
        >
          <div class="option-icon">
            🇬🇧
          </div>
          <h2>London</h2>
          <p>Find the 32 boroughs</p>
        </div>
        <div
          class="city-option"
          @click="selectCity('barcelona')"
        >
          <div class="option-icon">
            🏛️
          </div>
          <h2>Barcelona</h2>
          <p>Find the 10 districts</p>
        </div>
        <div
          class="city-option"
          @click="selectCity('bordeaux')"
        >
          <div class="option-icon">
            🍷
          </div>
          <h2>Bordeaux</h2>
          <p>Find the city quartiers</p>
        </div>
      </div>
    </div>

    <div
      v-else
      class="game-container"
    >
      <button
        class="back-button"
        @click="returnToCityMenu"
      >
        ← Back to Cities
      </button>
      <component :is="selectedCityComponent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import ParisArrondissements from "./ParisArrondissements.vue";
import LondonBoroughs from "./LondonBoroughs.vue";
import BarcelonaDistricts from "./BarcelonaDistricts.vue";
import BordeauxQuartiers from "./BordeauxQuartiers.vue";

const selectedCity = ref<string | null>(null);

const selectedCityComponent = computed(() => {
  switch (selectedCity.value) {
    case "paris":
      return ParisArrondissements;
    case "london":
      return LondonBoroughs;
    case "barcelona":
      return BarcelonaDistricts;
    case "bordeaux":
      return BordeauxQuartiers;
    default:
      return null;
  }
});

const selectCity = (city: string) => {
  selectedCity.value = city;
};

const returnToCityMenu = () => {
  selectedCity.value = null;
};
</script>

<style scoped>
.city-districts {
  position: relative;
  width: 100%;
}

.city-selection {
  display: flex;
  flex-direction: column;
}

.selection-header {
  text-align: center;
  margin-bottom: 40px;
}

.selection-header h1 {
  font-size: 2.5rem;
  color: var(--text-color);
  margin-bottom: 10px;
}

.selection-header p {
  font-size: 1.2rem;
  color: var(--text-color);
  opacity: 0.8;
}

.city-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  justify-items: center;
  gap: 30px;
  max-width: 1000px;
  margin: 0 auto 40px;
}

.city-option {
  background-color: var(--header-bg);
  border-radius: 10px;
  padding: 30px;
  width: 100%;
  max-width: 250px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 10px rgb(0 0 0 / 10%);
}

.city-option:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgb(0 0 0 / 20%);
}

.option-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.city-option h2 {
  color: var(--text-color);
  margin-bottom: 10px;
  font-size: 1.5rem;
}

.city-option p {
  color: var(--text-color);
  opacity: 0.8;
}

.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.back-button {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1500;
  background-color: var(--header-bg);
  color: var(--text-color);
  border: none;
  padding: 8px 15px;
  border-radius: 5px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 2px 5px rgb(0 0 0 / 20%);
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: rgb(128 128 128 / 30%);
}

@media (width <= 600px) {
  .city-options {
    grid-template-columns: 1fr;
    max-width: 300px;
  }
}
</style>
