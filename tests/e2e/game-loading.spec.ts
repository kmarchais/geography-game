import { test, expect } from '@playwright/test';

test.describe('Game Loading - Pilot Games', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display home page with game hub', async ({ page }) => {
    await expect(page.getByText('Geography Game Hub')).toBeVisible();
    await expect(
      page.getByText('Select a category to explore different geography challenges')
    ).toBeVisible();
  });

  test('should display search bar', async ({ page }) => {
    await expect(page.getByLabel('Search games...')).toBeVisible();
  });

  test.describe('World Countries', () => {
    test('should display World Countries game button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /World Countries/i })).toBeVisible();
    });

    test('should navigate to World Countries game', async ({ page }) => {
      await page.getByRole('button', { name: /World Countries/i }).click();
      await expect(page).toHaveURL('/game/world-countries');
    });

    test('should load World Countries game view', async ({ page }) => {
      await page.goto('/game/world-countries');
      await expect(page.getByText('World Countries')).toBeVisible();

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });

    test('should show difficulty chip', async ({ page }) => {
      const gameButton = page.getByRole('button', { name: /World Countries/i });
      await expect(gameButton).toBeVisible();

      // World Countries has difficulty 4 (Expert)
      await expect(gameButton.locator('.v-chip')).toContainText('Expert');
    });
  });

  test.describe('European Countries', () => {
    test('should display European Countries game button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /European Countries/i })).toBeVisible();
    });

    test('should navigate to European Countries game', async ({ page }) => {
      await page.getByRole('button', { name: /European Countries/i }).click();
      await expect(page).toHaveURL('/game/europe-countries');
    });

    test('should load European Countries game view', async ({ page }) => {
      await page.goto('/game/europe-countries');
      await expect(page.getByText('European Countries')).toBeVisible();

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });
  });

  test.describe('US States', () => {
    test('should display US States game button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /US States/i })).toBeVisible();
    });

    test('should navigate to US States game', async ({ page }) => {
      await page.getByRole('button', { name: /US States/i }).click();
      await expect(page).toHaveURL('/game/us-states');
    });

    test('should load US States game view', async ({ page }) => {
      await page.goto('/game/us-states');
      await expect(page.getByText('US States')).toBeVisible();

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });
  });

  test.describe('Paris Arrondissements', () => {
    test('should display Paris Arrondissements game button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Paris Arrondissements/i })).toBeVisible();
    });

    test('should navigate to Paris Arrondissements game', async ({ page }) => {
      await page.getByRole('button', { name: /Paris Arrondissements/i }).click();
      await expect(page).toHaveURL('/game/paris-arrondissements');
    });

    test('should load Paris Arrondissements game view', async ({ page }) => {
      await page.goto('/game/paris-arrondissements');
      await expect(page.getByText('Paris Arrondissements')).toBeVisible();

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });

    test('should show difficulty chip for Easy game', async ({ page }) => {
      const gameButton = page.getByRole('button', { name: /Paris Arrondissements/i });
      await expect(gameButton).toBeVisible();

      // Paris has difficulty 1 (Easy)
      await expect(gameButton.locator('.v-chip')).toContainText('Easy');
    });
  });

  test.describe('London Boroughs', () => {
    test('should display London Boroughs game button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /London Boroughs/i })).toBeVisible();
    });

    test('should navigate to London Boroughs game', async ({ page }) => {
      await page.getByRole('button', { name: /London Boroughs/i }).click();
      await expect(page).toHaveURL('/game/london-boroughs');
    });

    test('should load London Boroughs game view', async ({ page }) => {
      await page.goto('/game/london-boroughs');
      await expect(page.getByText('London Boroughs')).toBeVisible();

      // Wait for map to load
      await page.waitForSelector('.leaflet-container', { timeout: 10000 });
      await expect(page.locator('.leaflet-container')).toBeVisible();
    });

    test('should show difficulty chip for Easy game', async ({ page }) => {
      const gameButton = page.getByRole('button', { name: /London Boroughs/i });
      await expect(gameButton).toBeVisible();

      // London has difficulty 1 (Easy)
      await expect(gameButton.locator('.v-chip')).toContainText('Easy');
    });
  });

  test.describe('Search Functionality', () => {
    test('should filter games by search query', async ({ page }) => {
      const searchBox = page.getByLabel('Search games...');
      await searchBox.fill('Paris');

      // Should show Paris game
      await expect(page.getByRole('button', { name: /Paris Arrondissements/i })).toBeVisible();

      // Should not show other games
      await expect(page.getByRole('button', { name: /World Countries/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /London Boroughs/i })).not.toBeVisible();
    });

    test('should show no results message for invalid search', async ({ page }) => {
      const searchBox = page.getByLabel('Search games...');
      await searchBox.fill('xyz123notfound');

      await expect(page.getByText(/No games found matching/i)).toBeVisible();
    });

    test('should show all games when search is cleared', async ({ page }) => {
      const searchBox = page.getByLabel('Search games...');

      // Fill and then clear
      await searchBox.fill('Paris');
      await searchBox.clear();

      // All 5 pilot games should be visible
      await expect(page.getByRole('button', { name: /World Countries/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /European Countries/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /US States/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /Paris Arrondissements/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /London Boroughs/i })).toBeVisible();
    });

    test('should filter by category', async ({ page }) => {
      const searchBox = page.getByLabel('Search games...');
      await searchBox.fill('countries');

      // Should show country games
      await expect(page.getByRole('button', { name: /World Countries/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /European Countries/i })).toBeVisible();

      // Should not show non-country games
      await expect(page.getByRole('button', { name: /US States/i })).not.toBeVisible();
      await expect(page.getByRole('button', { name: /Paris Arrondissements/i })).not.toBeVisible();
    });
  });

  test.describe('Category Sections', () => {
    test('should display countries category section', async ({ page }) => {
      await expect(page.getByText('Country Maps')).toBeVisible();
    });

    test('should display divisions category section', async ({ page }) => {
      await expect(page.getByText('Administrative Divisions')).toBeVisible();
    });

    test('should display cities category section', async ({ page }) => {
      await expect(page.getByText('City Districts')).toBeVisible();
    });
  });

  test.describe('Legacy Routes', () => {
    test('should redirect /world-countries to /game/world-countries', async ({ page }) => {
      await page.goto('/world-countries');
      await expect(page).toHaveURL('/game/world-countries');
    });

    test('should redirect /european-countries to /game/europe-countries', async ({ page }) => {
      await page.goto('/european-countries');
      await expect(page).toHaveURL('/game/europe-countries');
    });

    test('should redirect /us-states to /game/us-states', async ({ page }) => {
      await page.goto('/us-states');
      await expect(page).toHaveURL('/game/us-states');
    });

    test('should redirect /paris-arrondissements to /game/paris-arrondissements', async ({ page }) => {
      await page.goto('/paris-arrondissements');
      await expect(page).toHaveURL('/game/paris-arrondissements');
    });

    test('should redirect /london-boroughs to /game/london-boroughs', async ({ page }) => {
      await page.goto('/london-boroughs');
      await expect(page).toHaveURL('/game/london-boroughs');
    });
  });
});
