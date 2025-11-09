/**
 * Auth Store
 * Manages authentication state, user profile, and access token
 * Persists to localStorage for session continuity
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

// LocalStorage keys
const LOGGED_IN_KEY = 'app_isLoggedIn'
const USER_PROFILE_KEY = 'app_userProfile'
const ACCESS_TOKEN_KEY = 'app_accessToken'

// Interfaces
export interface UserProfile {
  id: number
  google_id?: string
  email: string
  name: string
  picture?: string
  is_admin?: boolean
}

interface BackendAuthResponse {
  status: string
  user: UserProfile
  access_token: string
}

// Backend URL configuration
const BASE_API_URL = import.meta.env.VITE_BACKEND_API_URL

if (!BASE_API_URL) {
  console.warn(
    'VITE_BACKEND_API_URL is not set in your environment variables (.env). ' +
    'API calls may fail. Using fallback \'/api\' - requires proxy setup.'
  )
}

const AUTH_ENDPOINT_URL = BASE_API_URL
  ? `${BASE_API_URL}/auth/google`
  : '/api/auth/google'

console.log(`Using backend auth endpoint: ${AUTH_ENDPOINT_URL}`)

export const useAuthStore = defineStore('auth', () => {
  // State
  const isLoggedIn = ref(false)
  const userProfile = ref<UserProfile | null>(null)
  const accessToken = ref<string | null>(null)

  // Initialize from localStorage
  function initializeFromStorage() {
    const storedLoggedIn = localStorage.getItem(LOGGED_IN_KEY) === 'true'
    const storedToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedProfileStr = localStorage.getItem(USER_PROFILE_KEY)

    let storedProfile: UserProfile | null = null
    if (storedProfileStr) {
      try {
        storedProfile = JSON.parse(storedProfileStr)
      } catch (e) {
        console.error('Error parsing stored user profile:', e)
        clearStorage()
        return
      }
    }

    // Ensure consistency: if profile & token exist, user should be logged in
    if (storedProfile && storedToken) {
      isLoggedIn.value = true
      userProfile.value = storedProfile
      accessToken.value = storedToken
      localStorage.setItem(LOGGED_IN_KEY, 'true')
    }
    // If loggedIn is true but no profile or token, clear everything
    else if (storedLoggedIn && (!storedProfile || !storedToken)) {
      clearStorage()
    }
  }

  // Clear all auth data from localStorage
  function clearStorage() {
    localStorage.removeItem(LOGGED_IN_KEY)
    localStorage.removeItem(USER_PROFILE_KEY)
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    isLoggedIn.value = false
    userProfile.value = null
    accessToken.value = null
  }

  // Watch for changes and update localStorage
  watch(isLoggedIn, (newValue) => {
    localStorage.setItem(LOGGED_IN_KEY, String(newValue))
  })

  watch(
    userProfile,
    (newProfile) => {
      if (newProfile) {
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(newProfile))
      } else {
        localStorage.removeItem(USER_PROFILE_KEY)
      }
    },
    { deep: true }
  )

  watch(accessToken, (newToken) => {
    if (newToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, newToken)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  })

  // Actions
  async function handleCredentialResponse(
    response: google.accounts.id.CredentialResponse
  ) {
    if (!response.credential) {
      console.error('Credential not found in Google response:', response)
      logout()
      return
    }

    console.log('Encoded JWT ID token received from Google:', response.credential)

    try {
      console.log(`Attempting to fetch: ${AUTH_ENDPOINT_URL}`)
      const backendResponse = await fetch(AUTH_ENDPOINT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: response.credential }),
      })

      // Improved error checking
      if (!backendResponse.ok) {
        let errorData = {}
        try {
          errorData = await backendResponse.json()
        } catch (_parseError) {
          errorData = {
            message: backendResponse.statusText,
            body: await backendResponse.text().catch(() => ''),
          }
        }
        console.error(
          `Backend authentication failed: ${backendResponse.status} ${backendResponse.statusText}`,
          errorData
        )
        logout()
        return
      }

      const backendData = (await backendResponse.json()) as BackendAuthResponse
      console.log('Backend response:', backendData)

      // Update state from backend response
      if (backendData.user && backendData.access_token) {
        userProfile.value = backendData.user
        accessToken.value = backendData.access_token
        isLoggedIn.value = true

        console.log('User logged in. Profile and access token updated from backend.')
      } else {
        console.error(
          'Backend response missing user data or access token:',
          backendData
        )
        logout()
      }
    } catch (error: unknown) {
      console.error('Error during credential handling or backend call:', error)
      if (error instanceof TypeError) {
        console.error(
          'This might be a NetworkError (backend unreachable) or CORS issue. ' +
          `Check if the backend is running at the expected URL (${AUTH_ENDPOINT_URL}) ` +
          'and if CORS is configured correctly on the backend.'
        )
      }
      logout()
    }
  }

  function logout() {
    if (typeof google !== 'undefined' && google.accounts?.id) {
      google.accounts.id.disableAutoSelect()
    }

    // Clear state (watchers will clear localStorage)
    isLoggedIn.value = false
    userProfile.value = null
    accessToken.value = null

    console.log('User logged out (local state, profile, and access token cleared)')
  }

  // Initialize on store creation
  initializeFromStorage()

  return {
    // State
    isLoggedIn,
    userProfile,
    accessToken,
    // Actions
    handleCredentialResponse,
    logout,
  }
})
