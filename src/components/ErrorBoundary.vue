<template>
  <div
    v-if="error"
    class="error-boundary"
  >
    <v-container class="error-content">
      <v-row
        justify="center"
        align="center"
        class="fill-height"
      >
        <v-col
          cols="12"
          sm="8"
          md="6"
          class="text-center"
        >
          <v-icon
            size="80"
            color="error"
            class="mb-4"
          >
            mdi-alert-circle-outline
          </v-icon>

          <h1 class="text-h4 mb-4">
            Something went wrong
          </h1>

          <p class="text-body-1 mb-6 text-medium-emphasis">
            {{ errorMessage }}
          </p>

          <div
            v-if="showDetails"
            class="error-details mb-6"
          >
            <v-card
              variant="outlined"
              color="error"
            >
              <v-card-text>
                <pre class="text-caption text-left">{{ errorDetails }}</pre>
              </v-card-text>
            </v-card>
          </div>

          <div class="d-flex justify-center gap-3">
            <v-btn
              color="primary"
              size="large"
              prepend-icon="mdi-refresh"
              @click="retry"
            >
              Try Again
            </v-btn>

            <v-btn
              color="secondary"
              size="large"
              variant="outlined"
              prepend-icon="mdi-home"
              @click="goHome"
            >
              Go Home
            </v-btn>
          </div>

          <v-btn
            v-if="errorDetails"
            variant="text"
            size="small"
            class="mt-4"
            @click="showDetails = !showDetails"
          >
            {{ showDetails ? 'Hide' : 'Show' }} Technical Details
          </v-btn>
        </v-col>
      </v-row>
    </v-container>
  </div>

  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const error = ref(false)
const errorMessage = ref('')
const errorDetails = ref('')
const showDetails = ref(false)

/**
 * Capture errors from child components
 */
onErrorCaptured((err: Error, _instance, info) => {
  error.value = true
  errorMessage.value = err.message || 'An unexpected error occurred'

  // Build detailed error info
  const details = []
  details.push(`Error: ${err.name}`)
  details.push(`Message: ${err.message}`)
  if (info) {
    details.push(`Component: ${info}`)
  }
  if (err.stack) {
    details.push(`\nStack trace:\n${err.stack}`)
  }

  errorDetails.value = details.join('\n')

  // Log to console for debugging
  console.error('ErrorBoundary caught error:', err)
  console.error('Component info:', info)

  // Prevent error from propagating further
  return false
})

/**
 * Reset error state and retry
 */
function retry() {
  error.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  showDetails.value = false

  // Force re-render by triggering a route update
  const currentRoute = router.currentRoute.value
  router.replace({ path: currentRoute.path, query: { ...currentRoute.query, _retry: Date.now() } })
}

/**
 * Navigate to home page
 */
function goHome() {
  error.value = false
  errorMessage.value = ''
  errorDetails.value = ''
  showDetails.value = false
  router.push('/')
}
</script>

<style scoped>
.error-boundary {
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-content {
  max-width: 100%;
}

.error-details {
  max-width: 100%;
  overflow-x: auto;
}

.error-details pre {
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow-y: auto;
}

.gap-3 {
  gap: 12px;
}
</style>
