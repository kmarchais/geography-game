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
import { useGameRegistry } from './composables/useGameRegistry';
import { fetchAndCacheGeoJSON } from './utils/geo/geojsonCache';
import type { ProcessorName } from './utils/geo/processors/index';

// Apply flag emoji polyfill globally
polyfillCountryFlagEmojis();

// Load games into registry on app startup (lazy loaded by category)
onMounted(async () => {
  try {
    await loadAllGames();

    // Warm cache for featured games after games are loaded
    warmFeaturedGamesCache();
  } catch (error) {
    console.error('[App] Failed to load games:', error);
  }
});

/**
 * Warm cache for featured games in the background
 * This pre-fetches GeoJSON data for featured games to improve first-load experience
 */
function warmFeaturedGamesCache(): void {
  const registry = useGameRegistry();
  const featuredGames = registry.featured.value;

  if (featuredGames.length === 0) {
    return;
  }

  console.warn(`[App] Warming cache for ${featuredGames.length} featured games...`);

  // Fetch featured game data in background (fire and forget)
  featuredGames.forEach((game) => {
    const dataUrl = game.config.dataUrl;
    const processors = (game.config.processors || []) as ProcessorName[];

    // Silently fetch and cache - don't block or show errors
    fetchAndCacheGeoJSON(dataUrl, processors).catch(() => {
      // Silent fail - cache warming is optional optimization
    });
  });
}
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
