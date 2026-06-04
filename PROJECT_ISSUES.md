# Project Issues Review

**Date:** 2026-06-04
**Project:** `geography-game`
**Scope:** Frontend, game registry/data, tests/CI, deployment, service worker, and Flask backend.

## Commands run

| Command | Result |
|---|---|
| `bun install --frozen-lockfile` | Passed |
| `bun run type-check` | Passed |
| `bun run validate-total-rounds` | Passed (`28` configs validated) |
| `bun run build-only` | Passed; main JS now `588.82 kB`, CSS `714.12 kB`, MDI fonts copied |
| `SKIP_INTEGRATION_TESTS=true bun run test -- --run` | Passed, but `71` tests skipped |
| `bun run test -- --run` | Originally failed on London Boroughs; now passes on `fix/london-capitals-data` (`48` files, `722` tests passed, `30` skipped) |
| `bun run test -- --run src/utils/capitalCitiesData.spec.ts src/config/games/cities/london-boroughs.test.ts` | Passed (`8` tests) |
| `bunx eslint --config eslint.config.cjs .` | Passed with `209` warnings |
| `bunx stylelint 'src/**/*.{vue,scss}'` | Failed: `12` errors |
| Local Vite dev smoke test | Default URL is `/geography-game/`; `/game/world-countries` returns `404` without the base path |

---

## Critical / high-priority issues

### 1. London Boroughs game data source was broken — fixed in `fix/london-capitals-data`
- **Files:** `src/config/games/cities/london-boroughs.json`, `src/config/games/cities/london-boroughs.test.ts`, `public/data/london-boroughs.geojson`
- **Original evidence:** Full test run failed with `SyntaxError: Unexpected token '<', "<html lang"... is not valid JSON` because the `gis2.london.gov.uk` URL redirected to an HTML ArcGIS page.
- **Fix:** Vendored the 33-feature GeoJSON snapshot from `https://gis.london.gov.uk/arcgis/rest/services/apps/webmap_context_layer/MapServer/3/query?outFields=*&where=1%3D1&f=geojson` at `public/data/london-boroughs.geojson`, updated the game config to `/data/london-boroughs.geojson`, made the generated game test read the local fixture, and made startup cache warming resolve local URLs through `BASE_URL`.
- **Status:** Resolved by this PR branch.

### 2. Initial app load prefetches a large amount of duplicate external GeoJSON
- **Files:** `src/App.vue:23-57`, `src/utils/geo/geojsonCache.ts:219-225`
- `warmFeaturedGamesCache()` runs on startup and fetches all featured games.
- There are `11` featured games; `7` of them fetch the same `ne_50m_admin_0_countries.geojson` file with different processors.
- The Natural Earth countries file is about `4 MB`, so startup can trigger roughly `28 MB+` of duplicate country downloads plus French departments (~`3.7 MB`) and other sources.
- **Impact:** Slow home page, unnecessary bandwidth, possible rate limiting, and silent failures.
- **Recommendation:** Remove eager warming, throttle it, cache raw URL responses separately from processed results, deduplicate in-flight requests, and only prefetch after user intent/idle time.

### 3. E2E tests are disabled and the current Playwright config is incompatible with the default base path
- **Files:** `.github/workflows/deploy.yml:42-49`, `playwright.config.ts:34,61-64`, `vite.config.mts:41-45`
- CI comments out E2E tests entirely.
- Default Vite base is `/geography-game/`; local dev reports `http://127.0.0.1:3007/geography-game/` and `/game/world-countries` returns `404` without the base.
- E2E tests navigate to `/game/...` and expect URLs without `/geography-game/`.
- E2E tests are also stale: they expect difficulty chips that `GameButton.vue` no longer renders.
- **Impact:** Browser regressions are not caught.
- **Recommendation:** Either set `BASE_URL=/` for E2E/dev or update Playwright `baseURL` to `/geography-game/`; re-enable E2E in CI against `vite preview` or a built static server.

### 4. Stats are not loaded when a user logs in after the stats store was created
- **Files:** `src/stores/stats.ts:133-178`, `src/stores/stats.ts:207-215`
- `initializeFromStorage()` returns early if the user is not logged in when the store is first created.
- There is no watcher on auth state to load the correct per-user stats after login.
- **Impact:** Existing stats may appear empty until refresh and can be overwritten by the next recorded result.
- **Recommendation:** Watch `authStore.userProfile?.id` / `authStore.isLoggedIn`, load the matching user stats on login, and clear/switch stats on logout/user switch.

### 5. “New best score/time” detection is likely wrong
- **Files:** `src/components/MapGame.vue:215-232`, `src/components/MapGame.vue:560-596`
- `isNewBestScore` and `isNewBestTime` compare against `currentGameStats`, but `gameEnded` immediately records the current result into the same store.
- After recording, `bestScore`/`bestTime` already include the current result, so `weightedScore > bestScore` and `time < bestTime` are usually false.
- **Impact:** “New Best Score!” / “New Best Time!” may never show, and “Previous Best” can display the new result rather than the previous one.
- **Recommendation:** Snapshot previous stats before `recordGameResult()` and compare against that snapshot.

### 6. Dynamic game navigation can reuse `MapGame` without reloading map data
- **Files:** `src/views/GameView.vue:42-54`, `src/components/MapGame.vue:397-431`
- `MapGame` loads GeoJSON only in `onMounted()` and has no watcher for `geojsonUrl`, processors, or map options.
- `GameView` renders `<MapGame>` without a `:key`; quick route changes between `/game/:gameId` can reuse the component instance.
- **Impact:** Navigating from one game to another can leave stale map data/state.
- **Recommendation:** Add `:key="gameDefinition.id"` to `MapGame` and/or implement a proper reload watcher with cleanup/abort.

### 7. Auth tokens are stored indefinitely in origin-wide `localStorage`
- **Files:** `src/stores/auth.ts:10-13`, `src/stores/auth.ts:52-73`, `src/stores/auth.ts:108-113`, `db/app.py:33-38`
- JWT access tokens are stored as `app_accessToken` in `localStorage`.
- On GitHub Pages, every project under `https://kmarchais.github.io` shares the same origin and can read those keys.
- The token expires after 1 hour server-side, but the frontend does not decode/check expiry and keeps `isLoggedIn=true` indefinitely.
- **Impact:** Higher XSS/cross-project token exposure risk and stale authenticated UI after token expiry.
- **Recommendation:** Prefer httpOnly secure cookies or in-memory tokens with refresh; namespace storage keys by app; decode/check JWT expiry or handle 401 by logging out.

### 8. ESLint still has many warnings
- **Files:** `.eslintignore`, `eslint.config.cjs`, many source/test files
- `bunx eslint --config eslint.config.cjs .` now exits successfully after removing unused code touched during this PR.
- Remaining output: `209` warnings, mostly `any` and `console.log`.
- ESLint 9 still warns that `.eslintignore` is obsolete.
- `package.json:14` defines `lint` with `--fix`, so the normal lint script mutates files.
- **Recommendation:** Remove/replace `.eslintignore`, add a non-mutating `lint:check`, and scope console/no-explicit-any rules differently for scripts/tests.

### 9. Full test suite originally failed locally; CI still skips integration coverage
- **Files:** `vitest.config.ts:20-26`, `.github/workflows/deploy.yml:37-40`
- `bun run test -- --run` now passes on `fix/london-capitals-data` after vendoring London Boroughs data.
- CI still sets `SKIP_INTEGRATION_TESTS=true`, excluding generated game config/data loading tests.
- **Impact:** Future broken external game data can still reach production.
- **Recommendation:** Keep local fixtures for critical games and run network tests separately on a schedule, or re-enable deterministic non-network generated tests in CI.

### 10. Manual game lists in tests are stale and omit French Departments
- **Files:** `src/utils/__tests__/gameConfigValidation.spec.ts:1-72`, `src/utils/__tests__/gameDataLoading.spec.ts:1-80`, `src/config/games/games.spec.ts:1-120`
- These tests say “all 27 games”, but `validate-total-rounds` finds `28` configs and `gameLoader.ts` includes French Departments.
- French Departments is not included in the manual `ALL_GAMES` lists in these integration tests.
- **Impact:** Test coverage drifts from the real registry.
- **Recommendation:** Import from `getAllGames()` / `gameLoader.ts` instead of maintaining duplicate lists.

---

## Game logic and UX issues

### 11. Correct/skip/out-of-attempt map feedback is cleared immediately
- **Files:** `src/composables/useMapGameLogic.ts:163-180`, `src/composables/useMapGameLogic.ts:210-223`, `src/composables/useMapGameLogic.ts:245-279`
- `handleCorrectGuess()`, failed third attempts, and `skipEntity()` call `showFeedback()` and then immediately advance/select a new target, which calls `clearFeedback()`.
- **Impact:** Users do not reliably see success/skip/failure messages; click lockout via `feedback` is also bypassed for correct answers.
- **Recommendation:** Delay advancing until feedback has rendered, or do not clear feedback inside `selectNewTargetEntity()`.

### 12. Current map score display is inconsistent with final weighted scoring
- **Files:** `src/components/MapGame.vue:6-8`, `src/composables/useMapGameLogic.ts:245-249`
- Header score increments only for first-try answers, while final score is weighted out of 100 and includes second/third attempts.
- **Impact:** Users can answer correctly on later attempts but see no score progress.
- **Recommendation:** Display weighted score, correct count, or clearly label “Perfect first tries”.

### 13. Flag game can double-advance after a correct answer
- **Files:** `src/components/FlagGame.vue:196-200`, `src/components/FlagGame.vue:631-667`
- Correct answers schedule `nextRound()` after 2 seconds, while a visible “Next Flag” button can also call `nextRound()`.
- **Impact:** Users can skip an extra round or end early if they click before the timeout fires.
- **Recommendation:** Store and clear timeout IDs, or hide/disable the manual next button while auto-advance is pending.

### 14. Capital game scoring rewards worse guesses
- **Files:** `src/composables/useCapitalGameLogic.ts:41-44`, `src/composables/useCapitalGameLogic.ts:167-183`
- `calculateScore()` returns rounded distance, and `score += pointsEarned`; farther guesses add more points.
- Feedback says `+points` even for far misses.
- **Impact:** Higher score means worse performance, opposite of common game expectations.
- **Recommendation:** Either treat this as a “distance penalty” and sort lower-is-better, or invert the score so closer guesses earn more.

### 15. Flag and capital games do not record stats
- **Files:** `src/components/MapGame.vue:560-596`, `src/components/FlagGame.vue`, `src/components/CapitalGame.vue`
- Only `MapGame` records into `useStatsStore`.
- **Impact:** `/stats` excludes two major game modes.
- **Recommendation:** Add common game result recording for flags/capitals or document that stats only apply to map games.

### 16. Asynchronous timeouts are not cleared on unmount/reset in some games
- **Files:** `src/components/FlagGame.vue:665-667`, `src/composables/useCapitalGameLogic.ts:189,196`
- Auto-advance timers are not stored/cleared.
- **Impact:** State can mutate after unmount or after the user starts a new game.
- **Recommendation:** Track timeout IDs and clear them on unmount/reset/new round.

### 17. Map data fetches are not aborted on unmount or route change
- **Files:** `src/components/MapGame.vue:397-431`, `src/components/MapGame.vue:527-529`
- Long fetches continue after the component unmounts.
- **Impact:** Potential state updates on a removed map and wasted network.
- **Recommendation:** Use `AbortController` and ignore stale responses.

### 18. Map load errors are swallowed inside the game UI
- **Files:** `src/components/MapGame.vue:520-529`
- Async fetch/parse failures only set `targetEntity` to an error string; `ErrorBoundary` does not handle them.
- **Impact:** Users see a partially initialized game with no retry action.
- **Recommendation:** Emit/load error state to `GameView` or throw into a controlled error UI with retry.

### 19. Search only searches names, not tags/categories
- **Files:** `src/composables/useGameRegistry.ts:130-141`, `src/views/HomeView.vue:225-233`
- Documentation/comments describe tags/search, but `searchGames()` filters only `game.name`.
- **Impact:** Searching `easy`, `france`, `states`, or category tags can miss expected games.
- **Recommendation:** Search `name`, `tags`, `category`, `description`, and maybe `targetLabel`.

### 20. No catch-all/404 route
- **Files:** `src/router/index.ts`
- Unknown non-`/game/:gameId` paths render an empty router view instead of a 404 page.
- **Recommendation:** Add a catch-all route with a friendly not-found page.

### 21. Some game descriptions/counts are inconsistent
- **Files:** `src/config/games/cities/london-boroughs.json`, `src/config/games/divisions/us-states.json`
- London says “32 boroughs” but `totalRounds` is `33`.
- US States says “50 states” but `totalRounds` is `51` (likely DC included).
- **Recommendation:** Update labels/descriptions to match the actual entities.

### 22. French Departments game name is ambiguous
- **File:** `src/config/games/divisions/french-departments.json:3`
- Name is just `Departments`, which is ambiguous in stats/search/navigation.
- **Recommendation:** Use `French Departments` or `French Departments & Territories`.

---

## Data, caching, and service worker issues

### 23. External GeoJSON URLs are not pinned or vendored
- **Files:** `src/config/games/**/*.json`
- Many URLs use `@master`, `refs/heads/main`, live open-data exports, or third-party APIs.
- **Impact:** Counts/properties can change without code changes; games and tests become flaky.
- **Recommendation:** Pin to immutable commits/releases or vendor critical GeoJSON into `public/data/` with update scripts.

### 24. GeoJSON parser does not validate response type before `json()`
- **Files:** `src/components/MapGame.vue:429-431`, `src/utils/geo/geojsonCache.ts:219-225`
- A `200 text/html` response reaches `response.json()` and throws a confusing parse error.
- **Recommendation:** Validate `Content-Type` and GeoJSON shape; include URL/status/content-type in errors.

### 25. GeoJSON cache stores and returns mutable processed objects
- **Files:** `src/utils/geo/geojsonCache.ts:206-235`, `src/components/MapGame.vue:434-447`
- `MapGame` mutates returned cached features by adding `properties.name`/`code`.
- **Impact:** Cached data can be contaminated across callers with the same URL/processor key.
- **Recommendation:** Clone before returning or avoid mutating fetched data.

### 26. World wrapping mixes cloned collection with original feature objects
- **File:** `src/utils/geo/worldWrapping.ts:31-53`
- `wrappedCollection` is cloned, but `originalFeatures` comes from the original input and is inserted into the output.
- **Impact:** Later mutations to “wrapped” original features mutate the input/cache.
- **Recommendation:** Use `wrappedCollection.features` as the original copy source.

### 27. Service worker is hard-coded to `/geography-game/` and cache version `v1`
- **Files:** `public/service-worker.js:9-24`, `public/service-worker.js:222-223`
- Static cache paths and offline fallback ignore dynamic `BASE_URL` and PR preview paths.
- Cache names are origin-wide (`geography-game-v1`) and shared between main/PR previews.
- **Impact:** Offline fallback can point to the wrong build; previews/main can interfere via shared caches.
- **Recommendation:** Generate service worker from build metadata (e.g. Workbox/Vite PWA), include base path, and version caches per build.

### 28. Service worker contains unused/wrong pre-cache URL list
- **File:** `public/service-worker.js:26-30`
- `GEOJSON_URLS` is never used.
- It includes `ne_110m_admin_0_countries.geojson`, while the app uses `ne_50m_admin_0_countries.geojson`.
- **Recommendation:** Remove or wire it correctly via generated manifest.

### 29. Public debug test page is shipped to production
- **File:** `public/test-games.html`
- Vite copies it to `dist/test-games.html`.
- It contains stale URLs and debug code.
- **Recommendation:** Move it to docs/tools or exclude it from production builds.

### 30. Unused local data is shipped
- **File:** `public/data/bordeaux-quartiers.geojson`
- The Bordeaux game config uses the external API, but a `592 KB` local Bordeaux GeoJSON is still copied to `dist`.
- **Recommendation:** Use the local file or remove it from `public`.

### 31. Service worker/data caches have no quota/size strategy
- **File:** `public/service-worker.js`
- GeoJSON responses are cached without max entries/age beyond manual cache versioning.
- **Impact:** Large GeoJSON can accumulate until browser eviction.
- **Recommendation:** Add explicit cache expiration/size limits.

### 32. Manual marker watcher may leak
- **File:** `src/utils/markers/frenchTerritories.ts:114-139`
- `watch(found, ...)` is created from an async map initialization path and its stop handle is not retained.
- **Impact:** Watchers can outlive map instances if the component unmounts/reloads.
- **Recommendation:** Return cleanup from marker functions or register the watcher synchronously in component scope.

---

## Test quality issues

### 33. Important tests are skipped by default or in CI
- **Files:** `vitest.config.ts:17-26`, `src/components/MapGame.spec.ts:15-20`, `src/components/StatsChart.spec.ts:13`, `src/composables/useGameRegistry.spec.ts:5-7`
- `useCapitalGameLogic.spec.ts` is excluded entirely by Vitest config.
- `french-departments.test.ts` is excluded entirely.
- `MapGame.vue` and `StatsChart.vue` test suites are `describe.skip`.
- Registry tests are skipped when `SKIP_INTEGRATION_TESTS=true` even though they are not network integration tests.
- **Recommendation:** Separate true network tests from unit tests; unskip critical component/logic coverage.

### 34. Component tests often do not mount the real component
- **File:** `src/components/GameButton.spec.ts`
- Tests duplicate helper functions instead of testing `GameButton.vue` rendering/behavior.
- This missed the real unused `getDifficultyColor` and stale difficulty-chip behavior.
- **Recommendation:** Use `@vue/test-utils` with Vuetify test setup to mount actual components.

### 35. No stylelint script or CI stylelint step
- **Files:** `.stylelintrc.json`, `.github/workflows/deploy.yml`, `package.json`
- `bunx stylelint 'src/**/*.{vue,scss}'` fails with 12 errors, but there is no package script or CI check.
- **Recommendation:** Add `stylelint`/`stylelint:fix` scripts and run stylelint in CI.

### 36. No backend test/lint setup
- **Files:** `db/app.py`, `db/db_utils.py`, `requirements.txt`
- Flask auth/database behavior has no automated tests, type checks, or formatter/linter configuration.
- **Recommendation:** Add pytest tests with mocked Google/DB, plus ruff/black or equivalent.

### 37. No coverage thresholds
- **File:** `vitest.config.ts:35-45`
- Coverage is configured but no thresholds are enforced.
- **Recommendation:** Add realistic per-file/global thresholds after unskipping core tests.

---

## Build, tooling, and dependency issues

### 38. Default local dev URL/documentation mismatch
- **Files:** `vite.config.mts:41-45`, `README.md:44-46`, `CLAUDE.md`
- Vite redirects `/` to `/geography-game/`, but docs say open `http://localhost:3000`.
- **Recommendation:** Use `BASE_URL=/` for `bun dev` or update docs/tests to include `/geography-game/`.

### 39. `prebuild` mutates source files
- **File:** `package.json:9-10`, `scripts/add-total-rounds.ts`
- Running `bun run build` can rewrite JSON configs before building.
- **Impact:** Builds are not strictly read-only/reproducible.
- **Recommendation:** Move this to an explicit maintenance command or fail validation instead of mutating during build.

### 40. Tracked generated files can be changed by tooling
- **File:** `components.d.ts`
- Running Vite tooling regenerated `components.d.ts` in this review environment.
- **Recommendation:** Either commit generated changes consistently, generate in CI, or ignore generated type files if they are environment-sensitive.

### 41. Node/Bun versions are inconsistent
- **Files:** `.node-version:1`, `package.json:6`, `tsconfig.node.json`, `.github/workflows/deploy.yml:23-29`
- `.node-version` is `18.20.5`.
- `tsconfig.node.json` extends Node 22 config.
- CI installs `bun-version: latest` instead of the package manager version (`bun@1.1.43`).
- **Recommendation:** Pick supported versions and pin them consistently in `.node-version`, `packageManager`, CI, and docs.

### 42. Python dependencies are unpinned
- **File:** `requirements.txt:1-10`
- Requirements specify package names without versions.
- **Impact:** Backend builds can change unpredictably.
- **Recommendation:** Pin versions or use a lockfile (`uv`, Poetry, pip-tools, etc.).

### 43. Pre-commit config can diverge from project tooling
- **File:** `.pre-commit-config.yaml:16-29`
- Uses `language_version: "23.8.0"` and ESLint dependency versions that differ from `package.json`.
- **Recommendation:** Use the repo's package manager for lint hooks or pin matching versions.

### 44. Runtime dependencies include unused packages
- **File:** `package.json:25-37`
- Static search found no runtime usage of `@turf/union`, `jwt-decode`, or `vue-leaflet`.
- `unplugin-vue-router` is configured but the app uses a manual router.
- **Recommendation:** Remove unused runtime deps/plugins or document why they are needed.

### 45. Bundle is large for the home route
- **Build evidence:** `index-Cl-V_Z_X.js` `587.11 kB`, `index-C1JvGItc.css` `714.12 kB`, MDI font files copied (`woff2`, `woff`, `ttf`, `eot`).
- **Causes:** static route imports for map/flag/capital/admin views, full MDI webfont, full Vuetify styling.
- **Recommendation:** Lazy-load routes, use SVG icon imports or subset icons, and split game components from the home bundle.

### 46. The “lazy loader” still loads all categories on startup
- **Files:** `src/App.vue:22-28`, `src/utils/gameLazyLoader.ts:211-213`
- App calls `loadAllGames()` on mount.
- **Impact:** Config chunks are split but immediately loaded.
- **Recommendation:** Load only metadata needed for home, or load categories on expansion/navigation.

### 47. Vite/Railway allowed-host logic is fragile
- **File:** `vite.config.mts:15-37`
- `RAILWAY_STATIC_URL` may be a full URL, but Vite `allowedHosts` expects hostnames.
- Config prints warnings/logs during tests/builds.
- **Recommendation:** Parse with `new URL()` when needed and gate debug logs.

---

## Backend/API issues

### 48. Backend import fails completely when auth env vars are missing
- **File:** `db/app.py:41-56`
- Importing the Flask app raises if `GOOGLE_CLIENT_ID` or `JWT_SECRET_KEY` is missing.
- **Impact:** Health checks/tests/local backend startup fail before non-auth routes can run.
- **Recommendation:** Validate required settings at startup with clear deployment docs, but allow tests/health routes with test config.

### 49. No database schema or migrations are present
- **Files:** `db/db_utils.py`, repository root
- Backend expects `public.users` and `public.game_scores`, but no SQL migration/schema files are provided.
- **Impact:** New environments are hard to reproduce.
- **Recommendation:** Add migrations and documented setup.

### 50. Backend diagnostic logging is noisy and exposes DB metadata
- **File:** `db/db_utils.py:139-175`
- Every login runs diagnostic queries and logs DB name, schema, user, search path, and table existence.
- **Impact:** Noise and avoidable operational metadata exposure.
- **Recommendation:** Remove or gate diagnostics behind a debug flag.

### 51. Frontend `/api` fallback has no Vite proxy
- **Files:** `src/stores/auth.ts:31-43`, `src/views/DashboardView.vue:127-143`, `vite.config.mts`
- If `VITE_BACKEND_API_URL` is missing, frontend calls `/api/...`, but Vite config has no dev proxy to Flask.
- **Impact:** Local login/dashboard fail unless env vars are set correctly.
- **Recommendation:** Add `.env.example` and/or a dev proxy.

### 52. Admin dashboard response shape is brittle
- **Files:** `db/app.py:228-246`, `src/views/DashboardView.vue:153-162`
- Backend returns raw DB rows; frontend maps positional arrays (`row[0]`, `row[1]`, ...).
- **Impact:** Column order changes break the UI silently.
- **Recommendation:** Return JSON objects with named fields and type them in a shared API layer.

### 53. `/api/users` is unpaginated
- **File:** `db/app.py:235-236`, `db/db_utils.py:286-319`
- Fetches all users every time.
- **Recommendation:** Add pagination/search/sorting if this dashboard will be used beyond a small admin list.

### 54. CORS/deployment origins are hard-coded
- **File:** `db/app.py:33-39`
- Includes one hard-coded PR Railway host and the broad GitHub Pages origin.
- **Recommendation:** Load allowed origins from environment and document them.

### 55. Deployment entrypoints are ambiguous
- **Files:** `Procfile:1`, `package.json:23`
- `Procfile` starts the Flask backend; `package.json start` starts Vite preview.
- **Impact:** A single Railway/Nixpacks deployment may choose the wrong service for frontend vs backend.
- **Recommendation:** Split frontend/backend deployments or add explicit platform config.

---

## Accessibility, UI consistency, and documentation issues

### 56. Map interactions are not accessible by keyboard/screen readers
- **Files:** `src/components/MapGame.vue`, `src/components/CapitalGame.vue`
- Core gameplay depends on mouse/touch Leaflet polygons/points.
- No alternate list mode, keyboard selection, `aria-live` feedback announcements, or target/status semantics.
- **Recommendation:** Add accessible fallback controls and live regions for score/feedback/target changes.

### 57. Several icon-only or dynamic controls lack explicit accessible labels
- **Files:** `src/components/AppBar.vue`, `src/components/MapGame.vue`, `src/components/FlagGame.vue`
- Theme toggle is icon-only; feedback/status changes are visual only.
- **Recommendation:** Add `aria-label`s and `aria-live="polite"` for game feedback.

### 58. `MapGame.vue` uses global styles that other components rely on
- **Files:** `src/components/MapGame.vue:601+`, `src/components/CapitalGame.vue`
- `MapGame` style block is not scoped and defines generic classes (`.map-container`, `.feedback`, `.game-header`).
- `CapitalGame` appears to rely on these shared/global styles.
- **Impact:** Fragile coupling and future route-level code splitting can break styles.
- **Recommendation:** Move shared map-game styles to an explicit stylesheet or scope/namespace component styles.

### 59. Flag game is visually inconsistent with Vuetify/dark theme
- **File:** `src/components/FlagGame.vue`
- Large custom CSS with hard-coded colors and no clear integration with Vuetify theme tokens.
- **Recommendation:** Refactor toward Vuetify components/theme variables.

### 60. README is still the default Vuetify scaffold
- **File:** `README.md:1-80`
- It describes Vuetify starter usage, yarn commands, and Vuetify copyright/license instead of this geography game.
- **Recommendation:** Replace with project-specific setup, env vars, architecture, backend instructions, and deployment notes.

### 61. No `.env.example`
- **Files:** repository root, `src/stores/auth.ts`, `db/app.py`
- Required frontend/backend environment variables are not documented in an example env file.
- **Recommendation:** Add `.env.example` covering `VITE_GOOGLE_CLIENT_ID`, `VITE_BACKEND_API_URL`, `GOOGLE_CLIENT_ID`, `JWT_SECRET_KEY`, and DB variables.

### 62. Docs and tests disagree on game count
- **Files:** `CLAUDE.md`, `src/utils/__tests__/gameConfigValidation.spec.ts`, `src/utils/__tests__/gameDataLoading.spec.ts`, `scripts/validate-total-rounds.ts`
- Some docs/tests say `27` games; validation finds `28` configs.
- **Recommendation:** Generate counts from the registry or update docs/tests when adding games.

### 63. Old duplicate config modules remain unused
- **Files:** `src/utils/worldCountriesConfig.ts`, `src/utils/cityDistrictsConfig.ts`, `src/utils/gameLoader.ts` vs `src/utils/gameLazyLoader.ts`
- Old TypeScript configs include richer `nameMapping` behavior that the JSON registry path does not use.
- **Impact:** Confusing maintenance paths and lost display-name behavior.
- **Recommendation:** Remove obsolete configs or migrate useful mapping features into the JSON/processor system.

### 64. `nameMapping` exists in types but is not used by the JSON registry path
- **Files:** `src/types/game.d.ts`, `src/views/GameView.vue`, `src/components/MapGame.vue`
- `GameConfig` supports `nameMapping`, but `GameView` passes only `propertyName` into `MapGame`.
- **Impact:** Games with numeric/raw properties cannot customize display names through config.
- **Recommendation:** Add a serializable mapping/formatter mechanism or remove unsupported type fields.

### 65. PR preview deployment can accumulate stale files/comments
- **Files:** `.github/workflows/deploy.yml:87-129`
- PR previews use `clean: false` and there is no cleanup on PR close.
- Main deploy also uses `clean: false`, so old hashed root assets can accumulate.
- The workflow posts a new comment every run rather than updating an existing one.
- **Recommendation:** Add cleanup workflow/concurrency and update-or-create PR comments.

---

## Addendum: capital city dataset was outdated/incomplete — fixed in `fix/london-capitals-data`

- **Files:** `src/utils/capitalCitiesData.ts`, `src/utils/capitalCitiesData.spec.ts`, `CAPITAL_DATA_AUDIT.md`
- **Original evidence:** The game used Dar es Salaam for Tanzania, duplicated a Europe block inside the Asia section, listed Nigeria twice, used stale values for Burundi/Ukraine, and omitted many UN member states.
- **Fix:** Replaced the ad-hoc list with a deterministic 193-entry UN member-state snapshot, corrected known stale values, documented the one-capital policy, and added validation tests.
- **Status:** Resolved by this PR branch. Future improvements should extend the data model for aliases/notes on multi-capital or disputed cases.

---

## Quick remediation order

1. Re-enable deterministic E2E tests with the correct base path.
2. Stop startup cache warming or dedupe/throttle it.
3. Fix stats loading on login and new-best comparison.
4. Clean up ESLint warnings/stylelint errors and add non-mutating check scripts.
5. Replace stale manual test game lists with registry-derived lists.
6. Repair service worker base-path/cache versioning or remove it until generated PWA support is ready.
7. Update README/env/deployment docs.
