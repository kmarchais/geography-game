<template>
  <v-app-bar
    color="primary"
    dark
  >
    <v-app-bar-title>Geography Game</v-app-bar-title>
    <v-spacer />
    <v-btn
      text
      @click="goToHome"
    >
      Home
    </v-btn>
    <v-btn
      text
      @click="goToMapView"
    >
      Map View
    </v-btn>
    <v-btn
      text
      @click="toggleTheme"
    >
      <v-icon>mdi-theme-light-dark</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

const router = useRouter();
const theme = useTheme();
 
const goToHome = () => {
  router.push('/');
};

const goToMapView = () => {
  router.push('/map-view');
};

const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light';
};
</script>
