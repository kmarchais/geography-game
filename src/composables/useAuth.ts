// src/composables/useAuth.ts
import { ref, readonly, watch } from "vue";
// Removed jwtDecode as we'll use the backend's response directly for profile
// If you need to decode the *access token* later (e.g., to check expiry client-side),
// you might re-import it. import { jwtDecode } from "jwt-decode";

// Define keys for localStorage
const LOGGED_IN_KEY = "app_isLoggedIn";
const USER_PROFILE_KEY = "app_userProfile";
const ACCESS_TOKEN_KEY = "app_accessToken"; // Key for storing our backend's JWT

// --- Define Interfaces ---
interface UserProfile {
  id: number; // Assuming backend sends 'id' (internal DB ID)
  google_id?: string; // Optional, if backend sends it
  email: string;
  name: string;
  picture?: string;
  is_admin?: boolean; // Optional, if backend sends it
  // Add other fields your backend might return in the 'user' object
}

// Interface for the expected structure of the backend response
interface BackendAuthResponse {
  status: string;
  user: UserProfile;
  access_token: string; // The JWT issued by *your* backend
}

// --- Initialize state from localStorage ---
// Read initial values synchronously when the module loads
const initialLoggedIn = ref(localStorage.getItem(LOGGED_IN_KEY) === "true");
const initialProfile = ref<UserProfile | null>(null);
const initialAccessToken = ref<string | null>(
  localStorage.getItem(ACCESS_TOKEN_KEY),
);

const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
if (storedProfile) {
  try {
    initialProfile.value = JSON.parse(storedProfile);
  } catch (e) {
    console.error("Error parsing stored user profile:", e);
    localStorage.removeItem(LOGGED_IN_KEY);
    localStorage.removeItem(USER_PROFILE_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY); // Clear token too
    initialLoggedIn.value = false;
    initialAccessToken.value = null;
  }
}

// Ensure consistency: if profile & token exist, user should be logged in
if (initialProfile.value && initialAccessToken.value && !initialLoggedIn.value) {
  initialLoggedIn.value = true;
  localStorage.setItem(LOGGED_IN_KEY, "true");
}
// If loggedIn is true but no profile or no token, clear everything
if (
  initialLoggedIn.value &&
  (!initialProfile.value || !initialAccessToken.value)
) {
  initialLoggedIn.value = false;
  initialProfile.value = null;
  initialAccessToken.value = null;
  localStorage.removeItem(LOGGED_IN_KEY);
  localStorage.removeItem(USER_PROFILE_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

// Use the initialized refs
const isLoggedIn = initialLoggedIn;
const userProfile = initialProfile;
const accessToken = initialAccessToken; // Reactive ref for the access token

// --- Watch for changes and update localStorage ---
watch(isLoggedIn, (newValue) => {
  localStorage.setItem(LOGGED_IN_KEY, String(newValue)); // Store as 'true' or 'false'
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
  { deep: true },
);

watch(accessToken, (newToken) => {
  if (newToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
});

// --- Backend URL Configuration ---
// !! IMPORTANT !!
// Ensure VITE_BACKEND_API_URL is set in your .env file (e.g., .env.development)
// Example: VITE_BACKEND_API_URL=http://localhost:5001/api
// The code below assumes your auth endpoint is at `${VITE_BACKEND_API_URL}/auth/google`
const BASE_API_URL = import.meta.env.VITE_BACKEND_API_URL;

if (!BASE_API_URL) {
  console.warn(
    "VITE_BACKEND_API_URL is not set in your environment variables (.env). " +
      "API calls may fail. Using fallback '/api' - requires proxy setup.",
  );
}
// Construct the specific endpoint URL
const AUTH_ENDPOINT_URL = BASE_API_URL
  ? `${BASE_API_URL}/auth/google`
  : "/api/auth/google"; // Fallback if env var is missing

console.log(`Using backend auth endpoint: ${AUTH_ENDPOINT_URL}`); // Log the final URL being used

export function useAuth() {
  const handleCredentialResponse = async (
    response: google.accounts.id.CredentialResponse,
  ) => {
    if (!response.credential) {
      console.error("Credential not found in Google response:", response);
      logout(); // Ensure cleanup on error
      return;
    }

    console.log("Encoded JWT ID token received from Google:", response.credential);

    try {
      console.log(`Attempting to fetch: ${AUTH_ENDPOINT_URL}`); // Log before fetch
      const backendResponse = await fetch(AUTH_ENDPOINT_URL, {
        // Use the constructed URL
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No 'Authorization' header needed for the login request itself
        },
        body: JSON.stringify({ token: response.credential }),
      });

      // Improved error checking for network/CORS issues before .json()
      if (!backendResponse.ok) {
        let errorData = {};
        try {
          // Try to parse error json, but don't fail if it's not json
          errorData = await backendResponse.json();
        } catch (_parseError) {
          // If response isn't JSON (e.g., HTML error page, CORS block)
          errorData = {
            message: backendResponse.statusText,
            body: await backendResponse.text().catch(() => ""), // Try to get text body
          };
        }
        console.error(
          `Backend authentication failed: ${backendResponse.status} ${backendResponse.statusText}`,
          errorData,
        );
        logout(); // Clear local state and localStorage on backend failure
        return;
      }

      // Type assertion for the backend response
      const backendData = (await backendResponse.json()) as BackendAuthResponse;
      console.log("Backend response:", backendData);

      // --- Use data from YOUR backend ---
      if (backendData.user && backendData.access_token) {
        // Update reactive refs (this will trigger watchers to save to localStorage)
        userProfile.value = backendData.user; // Use the user object from backend
        accessToken.value = backendData.access_token; // Store the access token
        isLoggedIn.value = true; // Set loggedIn last

        console.log(
          "User logged in. Profile and access token updated from backend.",
        );
      } else {
        console.error(
          "Backend response missing user data or access token:",
          backendData,
        );
        logout(); // Logout if backend response is malformed
      }
    } catch (error: unknown) {
      // Catch block specifically for fetch or subsequent processing errors
      console.error("Error during credential handling or backend call:", error);
      // Check if it's a TypeError (often indicates network/CORS issues)
      if (error instanceof TypeError) {
        console.error(
          "This might be a NetworkError (backend unreachable) or CORS issue. " +
            `Check if the backend is running at the expected URL (${AUTH_ENDPOINT_URL}) ` +
            "and if CORS is configured correctly on the backend.",
        );
      }
      logout(); // Clear local state and localStorage on any error
    }
  };

  const logout = () => {
    if (typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }

    // Update reactive refs (this will trigger watchers to clear localStorage)
    isLoggedIn.value = false;
    userProfile.value = null;
    accessToken.value = null; // Clear the access token

    console.log(
      "User logged out (local state, profile, and access token cleared)",
    );
    // Optionally: Call backend logout endpoint if you implement one
  };

  return {
    isLoggedIn: readonly(isLoggedIn),
    userProfile: readonly(userProfile),
    accessToken: readonly(accessToken), // Expose the access token (read-only)
    handleCredentialResponse,
    logout,
  };
}
