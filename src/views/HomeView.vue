<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <!-- Use a div to allow content to potentially exceed viewport height -->
    <div style="width: 100%; max-width: 700px">
      <v-card
        class="pa-6"
        elevation="3"
      >
        <v-card-title class="text-h4 font-weight-bold mb-4 text-center">
          Geography Game Hub
        </v-card-title>

        <v-card-text class="text-body-1 mb-4 text-center">
          Select a category to explore different geography challenges
        </v-card-text>

        <!-- Search Bar -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search games..."
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="mb-4"
        />

        <v-divider class="mb-6" />

        <!-- Dynamic Game Categories from Registry -->
        <template v-if="filteredGames.length > 0">
          <GameCategorySection
            v-for="category in categoriesWithGames"
            :key="category"
            :category="category"
            :games="getGamesByCategory(category)"
          />
        </template>

        <!-- No Results Message -->
        <v-alert
          v-else-if="searchQuery"
          type="info"
          variant="tonal"
          class="mb-6"
        >
          No games found matching "{{ searchQuery }}"
        </v-alert>

        <!-- Flag and Capitals Cards -->
        <v-row
          dense
          class="mb-6"
        >
          <v-col
            cols="12"
            sm="6"
          >
            <v-card
              height="100%"
              variant="outlined"
              class="d-flex flex-column"
            >
              <v-card-title class="text-h6 bg-amber-lighten-5 py-3 px-4">
                <v-icon
                  start
                  color="amber-darken-2"
                  class="me-2"
                >
                  mdi-flag
                </v-icon>
                Flag Challenge
              </v-card-title>
              <v-card-text class="pt-3 pb-0">
                Test your knowledge of world flags
              </v-card-text>
              <v-card-actions class="mt-auto pa-4">
                <v-btn
                  block
                  color="amber-darken-2"
                  variant="elevated"
                  @click="navigateTo('/flag-game')"
                >
                  <v-icon
                    start
                    size="large"
                  >
                    mdi-play-circle
                  </v-icon>
                  <span>Play Flag Game</span>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col
            cols="12"
            sm="6"
          >
            <v-card
              height="100%"
              variant="outlined"
              class="d-flex flex-column"
            >
              <v-card-title class="text-h6 bg-purple-lighten-5 py-3 px-4">
                <v-icon
                  start
                  color="purple-darken-2"
                  class="me-2"
                >
                  mdi-city
                </v-icon>
                Capital Cities
              </v-card-title>
              <v-card-text class="pt-3 pb-0">
                Pin the capital cities on the map
              </v-card-text>
              <v-card-actions class="mt-auto pa-4">
                <v-btn
                  block
                  color="purple-darken-2"
                  variant="elevated"
                  @click="navigateTo('/world-capitals')"
                >
                  <v-icon
                    start
                    size="large"
                  >
                    mdi-play-circle
                  </v-icon>
                  <span>Play Capitals Game</span>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Coming Soon Card -->
        <v-card
          variant="outlined"
          class="mb-6"
        >
          <v-card-title class="text-h6 bg-teal-lighten-5 py-3 px-4">
            <v-icon
              start
              color="teal-darken-2"
              class="me-2"
            >
              mdi-puzzle-outline
            </v-icon>
            More Challenges (Coming Soon)
          </v-card-title>
          <v-card-text class="pt-4">
            <v-row dense>
              <v-col
                cols="12"
                md="4"
                sm="6"
              >
                <v-btn
                  block
                  disabled
                  class="mb-3 game-btn"
                >
                  <v-icon start>
                    mdi-water
                  </v-icon>
                  World Rivers
                </v-btn>
              </v-col>
              <v-col
                cols="12"
                md="4"
                sm="6"
              >
                <v-btn
                  block
                  disabled
                  class="mb-3 game-btn"
                >
                  <v-icon start>
                    mdi-image-filter-hdr
                  </v-icon>
                  Mountains
                </v-btn>
              </v-col>
              <v-col
                cols="12"
                md="4"
                sm="6"
              >
                <v-btn
                  block
                  disabled
                  class="mb-3 game-btn"
                >
                  <v-icon start>
                    mdi-bank
                  </v-icon>
                  Landmarks
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";
import { useGameRegistry } from '@/composables/useGameRegistry';
import GameCategorySection from '@/components/GameCategorySection.vue';
import type { GameDefinition } from '@/types/gameRegistry';

polyfillCountryFlagEmojis();

const registry = useGameRegistry();
const searchQuery = ref('');

// Get all games from registry
const allGames = computed(() => Array.from(registry.games.value.values()));

// Filter games based on search query
const filteredGames = computed(() => {
  if (!searchQuery.value) {
    return allGames.value;
  }
  return registry.searchGames(searchQuery.value);
});

// Get unique categories that have games
const categoriesWithGames = computed(() => {
  const categories = new Set(filteredGames.value.map(game => game.category));
  return Array.from(categories).sort();
});

// Get games for a specific category
const getGamesByCategory = (category: string): GameDefinition[] => {
  return filteredGames.value.filter(game => game.category === category);
};
</script>

<style scoped lang="scss">
.flag-emoji {
  font-family: Twemoji Country Flags, Apple Color emoji, Segoe UI emoji,
    Segoe UI Symbol, Noto Color emoji, EmojiOne Color, Android emoji, sans-serif;
  vertical-align: middle;
}

/* Ensure container allows scrolling if content overflows */
.v-container.fill-height {
  align-items: flex-start; /* Align items to top */
  overflow-y: auto; /* Allow vertical scroll */
  padding-top: 40px; /* Add some padding at the top */
  padding-bottom: 40px; /* Add some padding at the bottom */
}
</style>
