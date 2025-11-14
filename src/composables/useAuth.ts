/**
 * useAuth composable
 *
 * This composable now wraps the Pinia auth store for backward compatibility.
 * All authentication logic has been moved to src/stores/auth.ts
 *
 * Components can use either:
 * - useAuth() composable (for backward compatibility)
 * - useAuthStore() from Pinia (for new code)
 */

import { computed, readonly } from 'vue'
import { useAuthStore } from '../stores/auth'
import type { UserProfile } from '../stores/auth'

export type { UserProfile }

export function useAuth() {
  const authStore = useAuthStore()

  return {
    isLoggedIn: readonly(computed(() => authStore.isLoggedIn)),
    userProfile: readonly(computed(() => authStore.userProfile)),
    accessToken: readonly(computed(() => authStore.accessToken)),
    handleCredentialResponse: authStore.handleCredentialResponse,
    logout: authStore.logout,
  }
}
