// src/composables/useAuth.ts
import { ref, readonly } from "vue";
import { jwtDecode } from "jwt-decode"; // Install: bun add jwt-decode

// REMOVE this import line:
// import type { CredentialResponse } from 'google.accounts.id';

interface UserProfile {
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

const isLoggedIn = ref(false);
const userProfile = ref<UserProfile | null>(null);

export function useAuth() {
  // Reference the type directly from the global google object
  const handleCredentialResponse = (response: google.accounts.id.CredentialResponse) => {
    if (!response.credential) {
      console.error("Credential not found in response:", response);
      logout();
      return;
    }
    console.log("Encoded JWT ID token: " + response.credential);
    try {
      const decoded = jwtDecode<GoogleJwtPayload>(response.credential);
      console.log("Decoded JWT Payload:", decoded);

      userProfile.value = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
      };
      isLoggedIn.value = true;

      // --- IMPORTANT SECURITY NOTE ---
      // (Comment remains the same)
      // --------------------------------
    } catch (error) {
      console.error("Error decoding JWT token:", error);
      logout();
    }
  };

  const logout = () => {
    // The typeof check is still good runtime practice
    // The TS errors for 'google' here should hopefully be resolved by the type definitions
    if (typeof google !== "undefined" && google.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }

    isLoggedIn.value = false;
    userProfile.value = null;
    console.log("User logged out");
  };

  return {
    isLoggedIn: readonly(isLoggedIn),
    userProfile: readonly(userProfile),
    handleCredentialResponse,
    logout,
  };
}
