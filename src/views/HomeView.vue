// src/views/HomeView.vue

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card class="pa-6 text-center" elevation="3" max-width="500">
      <v-card-title class="text-h4 font-weight-bold mb-4">
        Geography Game Hub
      </v-card-title>

      <v-card-text class="text-body-1 mb-6">
        Select a map challenge below to test your geography knowledge!
      </v-card-text>

      <v-divider class="mb-6"></v-divider>

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-btn
            block
            color="blue-darken-1"
            size="large"
            class="mb-3"
            @click="navigateTo('/world-countries')"
          >
            World Countries
          </v-btn>
        </v-col>
        <v-col cols="12" sm="6">
          <v-btn
            block
            color="green-darken-1"
            size="large"
            class="mb-3"
            @click="navigateTo('/african-countries')"
          >
            African Countries
          </v-btn>
        </v-col>
        <v-col cols="12" sm="6">
          <v-btn
            block
            color="red-darken-1"
            size="large"
            class="mb-3"
            @click="navigateTo('/us-states')"
          >
            US States
          </v-btn>
        </v-col>
        <v-col cols="12" sm="6">
          <v-btn
            block
            color="purple-darken-1"
            size="large"
            class="mb-3"
            @click="navigateTo('/french-departments')"
          >
            French Departments
          </v-btn>
        </v-col>
      </v-row>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<style scoped>
/* Add any specific styles for the home view here if needed */
.v-card {
  border-radius: 8px;
}
.v-btn {
  text-transform: none; /* Keep button text case as is */
  font-weight: 500;
}
</style>
