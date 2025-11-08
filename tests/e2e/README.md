# E2E Tests for Geography Game

This directory contains end-to-end tests for the geography game using Playwright.

## Setup

### Install Playwright

```bash
bun add -D @playwright/test
bun x playwright install chromium
```

### Install Browsers (if needed)

```bash
bun x playwright install
```

## Running Tests

### Run all E2E tests

```bash
bun run test:e2e
```

### Run tests in UI mode (interactive)

```bash
bun run test:e2e:ui
```

### Debug tests

```bash
bun run test:e2e:debug
```

### Run specific test file

```bash
bun x playwright test tests/e2e/game-loading.spec.ts
```

### Run tests in headed mode (see browser)

```bash
bun x playwright test --headed
```

## Test Structure

### game-loading.spec.ts

Tests for game loading and navigation:
- ✅ Home page display
- ✅ Search functionality
- ✅ Category sections
- ✅ Game button rendering
- ✅ Navigation to game pages
- ✅ Legacy route redirects
- ✅ Map loading

**Coverage:**
- All 5 pilot games (World Countries, European Countries, US States, Paris Arrondissements, London Boroughs)
- Search and filtering
- Category organization
- Difficulty chips
- Route redirects

### game-play.spec.ts

Tests for actual gameplay:
- ✅ Game UI elements (title, score, timer, round counter)
- ✅ Map controls (zoom, pan)
- ✅ GeoJSON data loading
- ✅ Feature counts (correct number of entities)
- ✅ Click interactions
- ✅ Game flow
- ✅ Performance benchmarks
- ✅ Responsive design (mobile, tablet)

**Coverage:**
- Game initialization
- Map interaction
- Score tracking
- Round progression
- Performance metrics
- Cross-device compatibility

## Test Configuration

See `playwright.config.ts` for configuration details:
- **Base URL:** http://localhost:3000
- **Browsers:** Chromium (can add Firefox, WebKit)
- **Retries:** 2 on CI, 0 locally
- **Reporters:** HTML report
- **Screenshots:** On failure
- **Videos:** Retained on failure
- **Web Server:** Auto-starts dev server before tests

## CI/CD Integration

Tests are designed to run in CI environments:
- Auto-starts dev server
- Retries flaky tests
- Captures screenshots/videos on failure
- Generates HTML report

### GitHub Actions Example

```yaml
- name: Install dependencies
  run: bun install

- name: Install Playwright Browsers
  run: bun x playwright install --with-deps chromium

- name: Run E2E tests
  run: bun run test:e2e

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Writing New Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('should do something', async ({ page }) => {
    await expect(page.getByText('Expected Text')).toBeVisible();
  });
});
```

### Best Practices

1. **Wait for map to load**
   ```typescript
   await page.waitForSelector('.leaflet-container', { timeout: 10000 });
   await page.waitForTimeout(2000); // For GeoJSON to load
   ```

2. **Use semantic selectors**
   ```typescript
   // Good
   page.getByRole('button', { name: /World Countries/i })

   // Avoid
   page.locator('.some-class')
   ```

3. **Test user flows, not implementation**
   - Test what users see and do
   - Don't test internal state directly
   - Focus on behavior, not implementation details

4. **Keep tests independent**
   - Each test should run in isolation
   - Use `beforeEach` for setup
   - Don't rely on test execution order

## Debugging

### Debug a specific test

```bash
bun x playwright test --debug tests/e2e/game-loading.spec.ts
```

### Generate code for new tests

```bash
bun x playwright codegen http://localhost:3000
```

### View test report

```bash
bun x playwright show-report
```

## Performance Benchmarks

Current performance targets:
- World Countries: < 12s load time
- Paris Arrondissements: < 12s load time
- Search filter: < 1s response time

## Troubleshooting

### Port already in use

If dev server fails to start:
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Browser download failed

```bash
# Reinstall browsers
bun x playwright install --force
```

### Tests timing out

- Increase timeout in test: `test.setTimeout(30000)`
- Or globally in `playwright.config.ts`

## Coverage

Current E2E test coverage:
- ✅ 5/5 pilot games tested
- ✅ Search functionality
- ✅ Category sections
- ✅ Legacy route redirects
- ✅ Map loading and interaction
- ✅ Game UI components
- ✅ Responsive design
- ✅ Performance benchmarks

## Future Enhancements

- [ ] Visual regression testing
- [ ] Accessibility testing (axe-core)
- [ ] Full game playthrough automation
- [ ] Multi-browser testing (Firefox, WebKit)
- [ ] Mobile device emulation
- [ ] Network throttling tests
- [ ] Screenshot comparison
- [ ] Video recording for all tests
