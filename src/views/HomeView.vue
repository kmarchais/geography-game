<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <!-- Use a div to allow content to potentially exceed viewport height -->
    <div style="width: 100%; max-width: 700px">
      <v-card class="pa-6" elevation="3">
        <v-card-title class="text-h4 font-weight-bold mb-4 text-center">
          Geography Game Hub
        </v-card-title>

        <v-card-text class="text-body-1 mb-4 text-center">
          Select a category to explore different geography challenges
        </v-card-text>

        <v-divider class="mb-6" />

        <!-- Countries Card -->
        <v-card class="mb-6" variant="outlined">
          <v-card-title class="text-h6 bg-blue-lighten-5 py-3 px-4">
            <v-icon start color="blue-darken-2" class="me-2">
              mdi-earth
            </v-icon>
            Countries of the World
          </v-card-title>
          <v-card-text class="pt-4">
            <v-row dense>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="blue-darken-1"
                  @click="navigateTo('/world-countries')"
                >
                  <v-icon start> mdi-earth </v-icon>
                  World
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="green-darken-2"
                  @click="navigateTo('/african-countries')"
                >
                  <span class="me-1 continent-emoji">🌍</span>
                  Africa
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="red-darken-2"
                  @click="navigateTo('/asian-countries')"
                >
                  <span class="me-1 continent-emoji">🌏</span>
                  Asia
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="blue-grey darken-1"
                  @click="navigateTo('/european-countries')"
                >
                  <span class="me-1 continent-emoji">🌍</span>
                  Europe
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="orange darken-2"
                  @click="navigateTo('/north-american-countries')"
                >
                  <span class="me-1 continent-emoji">🌎</span>
                  N. America
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="pink darken-2"
                  @click="navigateTo('/south-american-countries')"
                >
                  <span class="me-1 continent-emoji">🌎</span>
                  S. America
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn
                  block
                  color="purple darken-2"
                  @click="navigateTo('/oceanian-countries')"
                >
                  <span class="me-1 continent-emoji">🌏</span>
                  Oceania
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Administrative Divisions Card -->
        <v-card class="mb-6" variant="outlined">
          <v-card-title class="text-h6 bg-green-lighten-5 py-3 px-4">
            <v-icon start color="green-darken-2" class="me-2">
              mdi-map-marker
            </v-icon>
            Administrative Divisions
          </v-card-title>
          <v-card-text class="pt-4">
            <v-row dense>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey"
                  @click="navigateTo('/us-states')"
                >
                  <span class="flag-emoji me-1">🇺🇸</span>
                  <span>US States</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey"
                  @click="navigateTo('/french-departments')"
                >
                  <span class="flag-emoji me-1">🇫🇷</span>
                  <span>French Depts.</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey"
                  @click="navigateTo('/spanish-communities')"
                >
                  <span class="flag-emoji me-1">🇪🇸</span>
                  <span>Spanish Comm.</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-1"
                  @click="navigateTo('/german-states')"
                >
                  <span class="flag-emoji me-1">🇩🇪</span>
                  <span>German States</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-2"
                  @click="navigateTo('/canadian-provinces')"
                >
                  <span class="flag-emoji me-1">🇨🇦</span>
                  <span>Canadian Prov.</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-3"
                  @click="navigateTo('/australian-states')"
                >
                  <span class="flag-emoji me-1">🇦🇺</span>
                  <span>Australian St.</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey"
                  @click="navigateTo('/brazilian-states')"
                >
                  <span class="flag-emoji me-1">🇧🇷</span>
                  <span>Brazilian States</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-1"
                  @click="navigateTo('/italian-regions')"
                >
                  <span class="flag-emoji me-1">🇮🇹</span>
                  <span>Italian Regions</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-2"
                  @click="navigateTo('/uk-counties')"
                >
                  <span class="flag-emoji me-1">🇬🇧</span>
                  <span>UK Counties</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-3"
                  @click="navigateTo('/russian-oblasts')"
                >
                  <span class="flag-emoji me-1">🇷🇺</span>
                  <span>Russian Oblasts</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-4"
                  @click="navigateTo('/ukrainian-oblasts')"
                >
                  <span class="flag-emoji me-1">🇺🇦</span>
                  <span>Ukrainian Oblasts</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-5"
                  @click="navigateTo('/chinese-provinces')"
                >
                  <span class="flag-emoji me-1">🇨🇳</span>
                  <span>Chinese Provinces</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-6"
                  @click="navigateTo('/belgian-provinces')"
                >
                  <span class="flag-emoji me-1">🇧🇪</span>
                  <span>Belgian Provinces</span>
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="12">
                <v-btn
                  block
                  color="blue-grey darken-7"
                  @click="navigateTo('/dutch-provinces')"
                >
                  <span class="flag-emoji me-1">🇳🇱</span>
                  <span>Dutch Provinces</span>
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Flag and Capitals Cards -->
        <v-row dense class="mb-6">
          <v-col cols="12" sm="6">
            <v-card height="100%" variant="outlined" class="d-flex flex-column">
              <v-card-title class="text-h6 bg-amber-lighten-5 py-3 px-4">
                <v-icon start color="amber-darken-2" class="me-2">
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
                  <v-icon start size="large"> mdi-play-circle </v-icon>
                  <span>Play Flag Game</span>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>

          <v-col cols="12" sm="6">
            <v-card height="100%" variant="outlined" class="d-flex flex-column">
              <v-card-title class="text-h6 bg-purple-lighten-5 py-3 px-4">
                <v-icon start color="purple-darken-2" class="me-2">
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
                  <v-icon start size="large"> mdi-play-circle </v-icon>
                  <span>Play Capitals Game</span>
                </v-btn>
              </v-card-actions>
            </v-card>
          </v-col>
        </v-row>

        <!-- Coming Soon Card -->
        <v-card variant="outlined" class="mb-6">
          <v-card-title class="text-h6 bg-teal-lighten-5 py-3 px-4">
            <v-icon start color="teal-darken-2" class="me-2">
              mdi-puzzle-outline
            </v-icon>
            More Challenges (Coming Soon)
          </v-card-title>
          <v-card-text class="pt-4">
            <v-row dense>
              <v-col cols="12" md="4" sm="6">
                <v-btn block disabled class="mb-3 game-btn">
                  <v-icon start> mdi-water </v-icon>
                  World Rivers
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn block disabled class="mb-3 game-btn">
                  <v-icon start> mdi-image-filter-hdr </v-icon>
                  Mountains
                </v-btn>
              </v-col>
              <v-col cols="12" md="4" sm="6">
                <v-btn block disabled class="mb-3 game-btn">
                  <v-icon start> mdi-bank </v-icon>
                  Landmarks
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- User List Section -->
        <!-- Conditionally render the UserList component if logged in -->
        <UserList v-if="isLoggedIn" />
      </v-card>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { polyfillCountryFlagEmojis } from "country-flag-emoji-polyfill";

// Import UserList and useAuth
import UserList from "@/components/UserList.vue"; // Adjust path if needed
import { useAuth } from "@/composables/useAuth"; // Adjust path if needed

polyfillCountryFlagEmojis();

const router = useRouter();
const { isLoggedIn } = useAuth(); // Get login status

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped lang="scss">
.flag-emoji {
  font-family: Twemoji Country Flags, Apple Color emoji, Segoe UI emoji,
    Segoe UI Symbol, Noto Color emoji, EmojiOne Color, Android emoji, sans-serif;
  vertical-align: middle;
}

/* Optional: Add some margin if needed, UserList already has internal padding */

/* .user-list-section {
  margin-top: 24px;
} */

/* Ensure container allows scrolling if content overflows */
.v-container.fill-height {
  align-items: flex-start; /* Align items to top */
  overflow-y: auto; /* Allow vertical scroll */
  padding-top: 40px; /* Add some padding at the top */
  padding-bottom: 40px; /* Add some padding at the bottom */
}
</style>
