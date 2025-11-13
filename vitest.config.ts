import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config.mts'

const isCI = process.env.SKIP_INTEGRATION_TESTS === 'true';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'happy-dom',
      exclude: [
        ...configDefaults.exclude,
        'e2e/**',
        'tests/e2e/**',
        // In CI, skip game config tests (they fetch external GeoJSON and are flaky)
        ...(isCI ? ['src/config/games/**/*.test.ts', 'src/utils/__tests__/gameDataLoading.spec.ts'] : []),
      ],
      root: fileURLToPath(new URL('./', import.meta.url)),
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      // Define BASE_URL for tests to resolve relative GeoJSON paths
      env: {
        VITE_BASE_URL: '/geography-game/',
      },
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'dist/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
          'tests/',
        ],
      },
    },
  }) as any
)
