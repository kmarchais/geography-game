<template>
  <v-app>
    <Header />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Header from './components/AppBar.vue';
import { loadGames } from './utils/gameLoader';

// Load games into registry on app startup
onMounted(() => {
  loadGames();
});
</script>
