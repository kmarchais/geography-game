// src/composables/useAuth.ts
import { ref, readonly, watch } from "vue"; // Import watch
import { jwtDecode } from "jwt-decode";

// Define keys for localStorage
const LOGGED_IN_KEY = "app_isLoggedIn";
const USER_PROFILE_KEY = "app_userProfile";

interface UserProfile {
  id?: number;
  email: string;
  name: string;
  picture?: string;
}

interface GoogleJwtPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  nbf: number;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  iat: number;
  exp: number;
  jti: string;
}

// --- Initialize state from localStorage ---
// Read initial values synchronously when the module loads
const initialLoggedIn = ref(localStorage.getItem(LOGGED_IN_KEY) === "true");
const initialProfile = ref<UserProfile | null>(null);
const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
if (storedProfile) {
  try {
    initialProfile.value = JSON.parse(storedProfile);
  } catch (e) {
    console.error("Error parsing stored user profile:", e);
    // Clear potentially corrupted data
    localStorage.removeItem(LOGGED_IN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    initialLoggedIn.value = false; // Reset loggedIn state if profile is corrupt
  }
}
// Ensure consistency: if profile exists, user should be logged in
if (initialProfile.value && !initialLoggedIn.value) {
    initialLoggedIn.value = true;
    localStorage.setItem(LOGGED_IN_KEY, "true");
}
// If loggedIn is true but no profile, clear loggedIn state
if (initialLoggedIn.value && !initialProfile.value) {
    initialLoggedIn.value = false;
    localStorage.removeItem(LOGGED_IN_KEY);
}


// Use the initialized refs
const isLoggedIn = initialLoggedIn;
const userProfile = initialProfile;

// --- Watch for changes and update localStorage ---
// Update localStorage whenever the reactive state changes
watch(isLoggedIn, (newValue) => {
  if (newValue) {
    localStorage.setItem(LOGGED_IN_KEY, "true");
  } else {
    localStorage.removeItem(LOGGED_IN_KEY);
  }
});

watch(
  userProfile,
  (newProfile) => {
    if (newProfile) {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile));
    } else {
      localStorage.removeItem(USER_PROFILE_KEY);
    }
  },
  { deep: true }, // Use deep watch for object changes
);

const BACKEND_API_URL =
  import.meta.env.VITE_BACKEND_API_URL || "/api/auth/google";

export function useAuth() {
  const handleCredentialResponse = async (
    response: google.accounts.id.CredentialResponse,
  ) => {
    if (!response.credential) {
      console.error("Credential not found in response:", response);
      logout();
      return;
    }

    console.log("Encoded JWT ID token received from Google:", response.credential);

    try {
      const backendResponse = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: response.credential }),
      });

      if (!backendResponse.ok) {
        const errorData = await backendResponse.json().catch(() => ({}));
        console.error(
          `Backend authentication failed: ${backendResponse.status} ${backendResponse.statusText}`,
          errorData,
        );
        logout(); // Clear local state and localStorage on backend failure
        return;
      }

      const backendData = await backendResponse.json();
      console.log("Backend response:", backendData);

      const decoded = jwtDecode<GoogleJwtPayload>(response.credential);

      // Update reactive refs (this will trigger the watchers to save to localStorage)
      userProfile.value = {
        id: backendData.user_id,
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      isLoggedIn.value = true; // Set this *after* profile is set

      console.log("User logged in and profile updated from backend.");
    } catch (error) {
      console.error("Error during credential handling or backend call:", error);
      logout(); // Clear local state and localStorage on error
    }
  };

  const logout = () => {
    if (typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.disableAutoSelect();
      // Optional: If Google provides a sign-out method, call it here
      // google.accounts.id.revoke(userProfile.value?.email || '', done => {
      //   console.log('Google token revoked.');
      // });
    }

    // Update reactive refs (this will trigger the watchers to clear localStorage)
    isLoggedIn.value = false;
    userProfile.value = null;

    console.log("User logged out (local state & localStorage cleared)");
    // Optionally: Call backend logout if needed
  };

  // The setup function for the composable
  // This part runs only once when the composable is first imported/used
  // We moved the initialization logic outside this function scope
  // so it runs when the module loads.

  return {
    // Return readonly versions for external use to prevent direct modification
    isLoggedIn: readonly(isLoggedIn),
    userProfile: readonly(userProfile),
    handleCredentialResponse,
    logout,
  };
}
