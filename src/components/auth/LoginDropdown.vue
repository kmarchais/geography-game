<template>
  <v-menu location="bottom end" transition="slide-y-transition" min-width="200">
    <template #activator="{ props }">
      <v-btn v-bind="props" variant="text">Login</v-btn>
    </template>

    <v-list density="compact">
      <v-list-item>
        <GoogleLoginButton />
      </v-list-item>
      <!-- You could add other login methods here later -->
      <!--
      <v-list-item>
        <v-btn block variant="text" @click="handleOtherLogin">
          Login with Email
        </v-btn>
      </v-list-item>
      -->
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import GoogleLoginButton from "./GoogleLoginButton.vue"; // Adjust path if needed

// No specific logic needed here for now,
// as GoogleLoginButton handles its own setup.
// If you add other login methods, their handlers would go here.
// const handleOtherLogin = () => { ... }
</script>

<style scoped>
/* Add any specific styling for the dropdown if needed */
</style>
