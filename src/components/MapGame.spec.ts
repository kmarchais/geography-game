/**
 * MapGame.vue component tests
 *
 * NOTE: These unit tests are skipped because MapGame requires extensive mocking
 * of Leaflet, Vuetify, and game logic composables. The component is thoroughly
 * tested via E2E tests which provide better coverage for this map-heavy component.
 *
 * For MapGame testing, see:
 * - e2e/ directory for end-to-end tests
 * - src/composables/useMapGameLogic.spec.ts for game logic unit tests
 */

import { describe, it } from 'vitest'

describe.skip('MapGame.vue', () => {
  it.skip('is tested via E2E tests', () => {
    // This component is tested via E2E tests due to complexity of mocking
    // Leaflet maps and related browser APIs
  })
})
