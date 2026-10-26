import { defineConfig, devices } from '@playwright/test'

const base = process.env.GLOBE_BASE_URL || '/geography-game/'
const port = Number(process.env.GLOBE_TEST_PORT) || 4174
const output = process.env.GLOBE_OUT_DIR || 'dist'

export default defineConfig({
  testDir: './tests/globe',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report/globe', open: 'never' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}${base}`,
    serviceWorkers: 'block',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
    { name: 'tablet', use: { ...devices['iPad Mini'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [
    { command: 'node server/ranking.mjs', url: 'http://127.0.0.1:4189/health', env: { ATLAS_PORT: '4189', ATLAS_DB: ':memory:', ATLAS_ALLOWED_ORIGINS: `http://127.0.0.1:${port}` }, reuseExistingServer: false },
    { command: `bun run preview --host 127.0.0.1 --port ${port} --outDir ${output}`, url: `http://127.0.0.1:${port}${base}`, env: { BASE_URL: base, ATLAS_PROXY_PORT: '4189' }, reuseExistingServer: false },
  ],
})
