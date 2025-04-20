<template>
  <v-app>
    <AppBar />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import AppBar from "./components/AppBar.vue";
</script>

<style>
@import url("https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap");

:root {
  font-family: "Roboto", sans-serif;
}

body {
  margin: 0;
  padding: 0;
}

/* Leaflet specific styles - needed for map to display correctly */
.leaflet-container {
  z-index: 0;
}

/* Target entity/department/country/state styles */
.target-entity {
  color: var(--text-color);
  font-size: 20px;
  font-weight: bold;
}
</style>
