<template>
  <v-app-bar
    color="primary"
    dark
  >
    <v-app-bar-title>Geography Game</v-app-bar-title>
    <v-spacer />
    <v-btn
      variant="text"
      @click="goToHome"
    >
      Home
    </v-btn>
    <v-btn
      variant="text"
      @click="goToUsStates"
    >
      US States
    </v-btn>
    <v-btn
      variant="text"
      @click="goToFrenchDepartments"
    >
      French Departments
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
import { useRouter } from 'vue-router';
import { useTheme } from 'vuetify';

const router = useRouter();
const theme = useTheme();
 
const goToHome = () => {
  router.push('/');
};

const goToUsStates = () => {
  router.push('/us-states');
};

const goToFrenchDepartments = () => {
  router.push('/french-departments');
};

const toggleTheme = () => {
  theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light';
};
</script>
