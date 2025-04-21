<template>
  <v-app-bar
    color="primary"
    dark
  >
    <v-app-bar-title>Geography Game</v-app-bar-title>
    <v-spacer />
    <v-btn
      variant="text"
      @click="goHome"
    >
      Home
    </v-btn>
    <v-btn
      variant="text"
      @click="toggleTheme"
    >
      <v-icon>mdi-theme-light-dark</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { useTheme } from "vuetify";

const router = useRouter();
const theme = useTheme();

const goHome = () => router.push('/');
const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light';
};
</script>
