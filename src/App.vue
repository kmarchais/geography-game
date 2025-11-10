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
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import Header from './components/AppBar.vue';
import { loadAllGames } from './utils/gameLazyLoader';

// Apply flag emoji polyfill globally
polyfillCountryFlagEmojis();

// Load games into registry on app startup (lazy loaded by category)
onMounted(async () => {
  try {
    await loadAllGames();
  } catch (error) {
    console.error('[App] Failed to load games:', error);
  }
});
</script>

<style>
/* Global layout reset */
html, body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

#app {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.v-application {
  min-height: 100%;
}

.v-main {
  flex: 1;
}

/* Make v-main__wrap flexible */
.v-main__wrap {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
