<template>
  <!-- Show login button if user is not authenticated -->
  <v-menu
    v-if="!isLoggedIn"
    location="bottom end"
    transition="slide-y-transition"
    min-width="200"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="text"
      >
        Login
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-item>
        <GoogleLoginButton />
      </v-list-item>
    </v-list>
  </v-menu>

  <!-- Show user profile if authenticated -->
  <v-menu
    v-else
    location="bottom end"
    transition="slide-y-transition"
    min-width="200"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        variant="text"
        class="profile-btn"
      >
        <v-avatar
          size="32"
          class="mr-2"
        >
          <v-img
            :src="userProfile?.picture"
            :alt="userProfile?.name"
          />
        </v-avatar>
        {{ userProfile?.name }}
      </v-btn>
    </template>

    <v-list density="compact">
      <v-list-item>
        <v-btn
          block
          variant="text"
          @click="logout"
        >
          Logout
        </v-btn>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup lang="ts">
import GoogleLoginButton from "./GoogleLoginButton.vue"
import { useAuth } from '../../composables/useAuth'

const { isLoggedIn, userProfile, logout } = useAuth()
</script>

<style scoped>
.profile-btn {
  min-width: 150px;
  justify-content: flex-start;
}
</style>
