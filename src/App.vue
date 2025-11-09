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
import { loadAllGames } from './utils/gameLazyLoader';

// Load games into registry on app startup (lazy loaded by category)
onMounted(async () => {
  try {
    await loadAllGames();
  } catch (error) {
    console.error('[App] Failed to load games:', error);
  }
});
</script>
