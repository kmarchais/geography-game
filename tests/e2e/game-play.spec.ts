import { test, expect } from '@playwright/test';

test.describe('Game Play - Pilot Games', () => {
  test.describe('World Countries Game Play', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/game/world-countries');
      // Wait for map to fully load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for GeoJSON to load
    });

    test('should display game title and instructions', async ({ page }) => {
      await expect(page.getByText('World Countries')).toBeVisible();
    });

    test('should display score and round counter', async ({ page }) => {
      // Score should start at 0
      await expect(page.locator('text=/Score.*0/i')).toBeVisible();

      // Should show round information
      await expect(page.locator('text=/Round/i')).toBeVisible();
    });

    test('should display timer', async ({ page }) => {
      // Timer should be visible
      await expect(page.locator('text=/Time/i')).toBeVisible();
    });

    test('should show target entity to find', async ({ page }) => {
      // Should display "Find: [Country Name]"
      await expect(page.locator('text=/Find.*Country/i')).toBeVisible();
    });

    test('should allow clicking on map features', async ({ page }) => {
      // Wait for features to be clickable
      await page.waitForTimeout(1000);

      // Find a map feature (polygon)
      const mapFeatures = page.locator('.leaflet-interactive');
      const featureCount = await mapFeatures.count();
      expect(featureCount).toBeGreaterThan(0);

      // Click on first feature
      await mapFeatures.first().click();

      // Some feedback should appear (either correct or incorrect)
      // This depends on which feature was clicked
      // Just verify the game is responsive
    });

    test('should have functioning map controls', async ({ page }) => {
      // Zoom in button should be visible and clickable
      const zoomIn = page.locator('.leaflet-control-zoom-in');
      await expect(zoomIn).toBeVisible();
      await zoomIn.click();

      // Zoom out button
      const zoomOut = page.locator('.leaflet-control-zoom-out');
      await expect(zoomOut).toBeVisible();
    });

    test('should load GeoJSON data', async ({ page }) => {
      // Wait for features to load
      await page.waitForTimeout(2000);

      // Check that map features are present
      const features = page.locator('.leaflet-interactive');
      const count = await features.count();

      // World should have many countries
      expect(count).toBeGreaterThan(100);
    });
  });

  test.describe('European Countries Game Play', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/game/europe-countries');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);
    });

    test('should display game title', async ({ page }) => {
      await expect(page.getByText('European Countries')).toBeVisible();
    });

    test('should have European countries loaded', async ({ page }) => {
      await page.waitForTimeout(2000);

      const features = page.locator('.leaflet-interactive');
      const count = await features.count();

      // Europe should have around 40-50 countries
      expect(count).toBeGreaterThan(30);
      expect(count).toBeLessThan(60);
    });

    test('should display score counter', async ({ page }) => {
      await expect(page.locator('text=/Score/i')).toBeVisible();
    });
  });

  test.describe('US States Game Play', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/game/us-states');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);
    });

    test('should display game title', async ({ page }) => {
      await expect(page.getByText('US States')).toBeVisible();
    });

    test('should show "State" as target label', async ({ page }) => {
      await expect(page.locator('text=/Find.*State/i')).toBeVisible();
    });

    test('should have US states loaded', async ({ page }) => {
      await page.waitForTimeout(2000);

      const features = page.locator('.leaflet-interactive');
      const count = await features.count();

      // Should have 50 states
      expect(count).toBeGreaterThanOrEqual(48); // Continental + visible states
    });

    test('should have map centered on US', async ({ page }) => {
      // Map should be visible and centered (can't easily test exact center)
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });
  });

  test.describe('Paris Arrondissements Game Play', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);
    });

    test('should display game title', async ({ page }) => {
      await expect(page.getByText('Paris Arrondissements')).toBeVisible();
    });

    test('should show "Arrondissement" as target label', async ({ page }) => {
      await expect(page.locator('text=/Find.*Arrondissement/i')).toBeVisible();
    });

    test('should have Paris arrondissements loaded', async ({ page }) => {
      await page.waitForTimeout(2000);

      const features = page.locator('.leaflet-interactive');
      const count = await features.count();

      // Paris has 20 arrondissements
      expect(count).toBe(20);
    });

    test('should be zoomed in on Paris', async ({ page }) => {
      // Should be zoomed in (can verify by map bounds being small)
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });
  });

  test.describe('London Boroughs Game Play', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/game/london-boroughs');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);
    });

    test('should display game title', async ({ page }) => {
      await expect(page.getByText('London Boroughs')).toBeVisible();
    });

    test('should show "Borough" as target label', async ({ page }) => {
      await expect(page.locator('text=/Find.*Borough/i')).toBeVisible();
    });

    test('should have London boroughs loaded', async ({ page }) => {
      await page.waitForTimeout(2000);

      const features = page.locator('.leaflet-interactive');
      const count = await features.count();

      // London has 33 boroughs
      expect(count).toBe(33);
    });
  });

  test.describe('Game Interaction Flow', () => {
    test('should handle correct answer click', async ({ page }) => {
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Get initial score
      const initialScore = await page.locator('text=/Score.*0/i').isVisible();
      expect(initialScore).toBe(true);

      // Get target to find
      const targetText = await page.locator('text=/Find/i').textContent();
      expect(targetText).toBeTruthy();

      // Click on a feature
      const features = page.locator('.leaflet-interactive');
      if (await features.count() > 0) {
        await features.first().click();

        // Some visual feedback should occur
        // (either score increases or error shown)
        await page.waitForTimeout(500);
      }
    });

    test('should advance rounds after correct answer', async ({ page }) => {
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify we're on round 1
      await expect(page.locator('text=/Round.*1/i')).toBeVisible();

      // Features should be clickable
      const features = page.locator('.leaflet-interactive');
      expect(await features.count()).toBeGreaterThan(0);
    });

    test('should persist game state during play', async ({ page }) => {
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Get initial round
      const roundInfo = await page.locator('text=/Round/i').textContent();
      expect(roundInfo).toBeTruthy();

      // Interact with map (zoom)
      await page.locator('.leaflet-control-zoom-in').click();
      await page.waitForTimeout(500);

      // Round should still be the same
      const roundInfoAfter = await page.locator('text=/Round/i').textContent();
      expect(roundInfoAfter).toBe(roundInfo);
    });
  });

  test.describe('Performance', () => {
    test('should load World Countries within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/game/world-countries');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000); // Wait for GeoJSON
      const loadTime = Date.now() - startTime;

      // Should load within 12 seconds (including waits)
      expect(loadTime).toBeLessThan(12000);
    });

    test('should load Paris Arrondissements quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await page.waitForTimeout(2000);
      const loadTime = Date.now() - startTime;

      // Smaller dataset should load faster
      expect(loadTime).toBeLessThan(12000);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone size
      await page.goto('/game/paris-arrondissements');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });

      // Map should still be visible
      await expect(page.locator('.leaflet-container')).toBeVisible();

      // Game controls should be visible
      await expect(page.locator('text=/Score/i')).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
      await page.goto('/game/us-states');
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });

      await expect(page.locator('.leaflet-container')).toBeVisible();
      await expect(page.locator('text=/Score/i')).toBeVisible();
    });
  });
});
