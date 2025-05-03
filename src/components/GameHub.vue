<template>
  <div class="game-hub">
    <div v-if="!selectedGameMode" class="game-selection">
      <div class="selection-header">
        <h1>Geography Games</h1>
        <p>Choose a game mode to play</p>
      </div>
      <div class="game-options">
        <div class="game-option" @click="selectGame('countries')">
          <div class="option-icon">🌎</div>
          <h2>Countries</h2>
          <p>Find countries on the world map</p>
        </div>
        <div class="game-option" @click="selectGame('capitals')">
          <div class="option-icon">🏙️</div>
          <h2>Capitals</h2>
          <p>Guess the location of capital cities</p>
        </div>
      </div>

      <!-- Add the UserList component below the game options -->
      <!-- Only show if the user is logged in -->
      <UserList v-if="isLoggedIn" class="user-list-section" />
    </div>

    <div v-else class="game-container">
      <button class="back-button" @click="returnToMenu">← Back to Menu</button>
      <component
        :is="selectedComponent"
        :map-options="mapOptions"
        :total-rounds-override="10"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import L from "leaflet";
import WorldCountries from "./WorldCountries/WorldCountries.vue"; // Adjust path if needed
import WorldCapitals from "../views/WorldCapitals.vue"; // Adjust path if needed

// Import the UserList component
import UserList from "../components/UserList.vue"; // Adjust path relative to GameHub.vue

// Import useAuth to check login status
import { useAuth } from "../composables/useAuth"; // Adjust path relative to GameHub.vue

const { isLoggedIn } = useAuth(); // Get the isLoggedIn state

const selectedGameMode = ref<string | null>(null);

const mapOptions = {
  initialCenter: [20, 0] as L.LatLngExpression,
  initialZoom: 2,
  minZoom: 2,
  maxZoom: 8,
  worldCopyJump: true,
  maxBounds: [
    [-90, -540],
    [90, 540],
  ] as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0,
};

const selectedComponent = computed(() => {
  switch (selectedGameMode.value) {
    case "countries":
      return WorldCountries;
    case "capitals":
      return WorldCapitals;
    default:
      return null;
  }
});

const selectGame = (mode: string) => {
  selectedGameMode.value = mode;
};

const returnToMenu = () => {
  selectedGameMode.value = null;
};
</script>

<style scoped>
.game-hub {
  position: relative;
  width: 100%;

  /* Adjust height if UserList makes it too long, or allow scrolling */
  min-height: 100vh;
  background-color: var(--map-bg);
  overflow-y: auto; /* Allow vertical scroll if content overflows */
}

.game-selection {
  display: flex;
  flex-direction: column;

  /* Use padding instead of justify-content to allow space for UserList */
  padding: 40px 20px;
  align-items: center;
  min-height: 100%;
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

.game-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 30px;
  max-width: 800px;
  margin-bottom: 40px; /* Add space below options */
}

.game-option {
  background-color: var(--header-bg);
  border-radius: 10px;
  padding: 30px;
  width: 250px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 10px rgb(0 0 0 / 10%);
}

.game-option:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgb(0 0 0 / 20%);
}

.option-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.game-option h2 {
  color: var(--text-color);
  margin-bottom: 10px;
  font-size: 1.5rem;
}

.game-option p {
  color: var(--text-color);
  opacity: 0.8;
}

/* Style the container for the UserList */
.user-list-section {
  width: 100%;
  max-width: 900px; /* Match UserList internal max-width */
  margin-top: 30px; /* Add space above the list */
}

.game-container {
  position: relative;
  width: 100%;
  height: 100vh; /* Keep game container full height */
  overflow: hidden; /* Prevent scrollbars within game */
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
  .game-options {
    flex-direction: column;
  }

  .game-option {
    width: 100%;
    max-width: 300px;
  }
}
</style>
