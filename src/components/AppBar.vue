<template>
  <v-app-bar
    color="primary"
    dark
  >
    <v-app-bar-title>Geography Game</v-app-bar-title>
    <v-spacer />

    <!-- Home Button -->
    <v-btn
      variant="text"
      @click="goHome"
    >
      Home
    </v-btn>

    <!-- Stats Button (Conditional) -->
    <v-btn
      v-if="isLoggedIn"
      variant="text"
      @click="goToStats"
    >
      📊 Stats
    </v-btn>

    <!-- Dashboard Button (Conditional) -->
    <v-btn
      v-if="isAdmin"
      variant="text"
      @click="goToDashboard"
    >
      Dashboard
    </v-btn>

    <!-- Login/User Dropdown -->
    <LoginDropdown />

    <!-- Theme Toggle Button -->
    <v-btn
      variant="text"
      @click="toggleTheme"
    >
      <v-icon>mdi-theme-light-dark</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script setup lang="ts">
  import { computed } from "vue"; // Import computed for cleaner check
  import { useRouter } from "vue-router";
  import { useTheme } from "vuetify";
  import LoginDropdown from "./auth/LoginDropdown.vue";
  import { useAuth } from "../composables/useAuth"; // Adjust path as needed

  const router = useRouter();
  const theme = useTheme();
  const { isLoggedIn, userProfile } = useAuth(); // Get reactive auth state

  // Computed property to determine if the user is an admin
  const isAdmin = computed(() => {
    // User must be logged in, have a profile, and the is_admin flag must be true
    return isLoggedIn.value && !!userProfile.value?.is_admin;
    // Using !!userProfile.value?.is_admin safely converts true/false/undefined to boolean
  });

  const goHome = () => router.push('/');

  // Function to navigate to the stats route
  const goToStats = () => router.push('/stats');

  // Function to navigate to the dashboard route
  const goToDashboard = () => router.push('/dashboard'); // Assumes you have a '/dashboard' route

  const toggleTheme = () => {
    theme.global.name.value = theme.global.name.value === 'light' ? 'dark' : 'light';
  };
</script>
