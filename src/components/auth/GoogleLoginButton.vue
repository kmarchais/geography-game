<template>
    <!-- This div is where Google will render its button -->
    <div ref="googleButtonContainer"></div>
  </template>

  <script setup lang="ts">
  import { ref, onMounted } from "vue";
  import { useAuth } from "../../composables/useAuth"; // Adjust path if needed
import { components } from "vuetify/dist/vuetify.js";

  const { handleCredentialResponse } = useAuth();
  const googleButtonContainer = ref<HTMLDivElement | null>(null);

  // Get Client ID from environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    console.error(
      "VITE_GOOGLE_CLIENT_ID is not defined. Please check your .env file.",
    );
  }

  onMounted(() => {
    if (!googleClientId) {
      console.error("Cannot initialize Google Sign-In: Client ID missing.");
      return;
    }

    // Check if the Google library is loaded
    if (typeof google !== "undefined") {
      // Initialize only once if not already done (though repeated calls are safe)
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleCredentialResponse,
      });

      // Render the Google Sign-In button into our target div
      if (googleButtonContainer.value) {
        google.accounts.id.renderButton(googleButtonContainer.value, {
          type: "standard", // Required property
          theme: "filled_blue",
          size: "large",
          // You might want 'medium' or 'small' size inside a menu
          // size: "medium",
        });
      } else {
        console.error("Google button container not found in the DOM.");
      }
    } else {
      console.error("Google Identity Services library not loaded.");
      // Handle the error, maybe show a fallback login method
    }
  });
  </script>

  <style scoped>
  /* Add minimal styling if needed, e.g., padding */
  div {
    padding: 8px; /* Add some padding around the Google button */
  }
  </style>
