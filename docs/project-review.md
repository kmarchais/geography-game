# Project review and 3D redesign

This is the original Orbit review. Atlas now uses one all-country challenge and a shared ranking service. See [Atlas validation](atlas-validation.md) and the current README for the active behavior.

Reviewed on 25 October 2026. Baseline `fb174d1`, work branch `feat/3d-globe`.

## Recommendation

Keep TypeScript and Vue. Replace the country game's Leaflet view with a small Three.js scene and a new responsive interface. A different language would add a second UI stack and a browser boundary without fixing the problems found here. GPU rendering, the size of geographic data, texture memory, and unnecessary startup work matter more for this mode than language choice.

The branch implements that first mode. Older country, division, district, flag, capital, authentication, and statistics pages remain available through **Classic games**. They load separately from the new game. This is a staged replacement, not a claim that every legacy mode has been rewritten.

## Review coverage

The review traced startup, routing, map selection, all three quiz composables, the game registries, JSON configuration, geographic processors, caching, timers, scoring, persistence, authentication, the Flask API, database helpers, build scripts, CI, deployment, and tests. Shared systems were examined across callers. Each legacy game configuration was inventoried, but the review did not manually play every district or division game.

Baseline verification used the locked dependencies, the TypeScript build, and the offline unit suite. It produced 515 passing tests and 71 skipped tests. Network-dependent configuration tests were excluded, as they are in the existing CI. The Flask service and its production database were reviewed as source; no live production service or user database was accessed.

## Findings in the original project

Priorities describe impact on this redesign. P1 blocks reliable delivery, P2 affects correctness or maintenance, and P3 is follow-up work.

| Priority | Finding and evidence | Consequence | Resolution on this branch |
| --- | --- | --- | --- |
| P1 | `public/service-worker.js` hard-coded the main deployment path and used a manually fixed cache version. Activation deleted every cache name except its own two names. | PR previews could cache the wrong shell. Other applications on the same origin could lose their caches. Hashed assets were not precached as a complete release. | Replaced with a scope-specific, content-versioned cache. The build collects the globe's exact dependency files. Only this app's old cache names are removed. |
| P1 | `.github/workflows/deploy.yml` disabled browser tests. `vitest.config.ts` skipped remote geography tests in CI. | A green build did not prove an actual game loaded or accepted answers. | Added production-build browser tests for desktop, Android emulation, and tablet emulation. Geography assertions use the checked-in snapshot. |
| P1 | Country configuration files pointed at a remote CloudFront Natural Earth dataset. Tiles came from CARTO. | The main activity depended on third-party availability and network latency. The old world game also had projection and repeated-world handling. | New mode uses local geometry and imagery on a sphere. Classic modes retain their original remote sources. |
| P1 | The locked dependency audit reported vulnerabilities in Vue's server renderer, Vitest, Vite, Happy DOM, Rollup, and several tooling dependencies. | Some advisories concern development servers or tooling, rather than this static game's runtime, but the lockfile needed maintenance before extending the project. | Updated dependencies within their declared ranges, refreshed transitive resolutions, and moved Happy DOM to its patched major. The final audit result is recorded in the validation report. |
| P2 | In `useMapGameLogic.ts`, correct answers, third failures, and skips call `showFeedback`, then `advanceRound`. The latter selects a target and calls `clearFeedback`. `endGame` also clears feedback. | Correct-answer feedback and the last answer could disappear before the learner saw them. | New game has explicit playing, answer, and complete states. The player advances after reading feedback. Legacy logic remains unchanged. |
| P2 | `MapGame.vue` ignores a clicked country once it appears in `foundEntities`. | In a test with hidden found-country colors, a previously completed country would become a free answer probe. | New game counts an incorrect country even if it was found earlier. Covered by a rule test. |
| P2 | `App.vue` called `loadAllGames` on mount and prefetched featured maps. Router components and global map/UI styles were eager imports. `gameLoader.ts` and `gameLazyLoader.ts` maintained separate lists. | The advertised lazy loading still loaded every category at startup. Data and UI for other modes competed with the game the player wanted. Duplicate lists could drift. | New route loads independently. Classic routing, Vuetify, Leaflet, Google sign-in, and classic initialization are deferred. Both legacy loaders still exist for compatibility. |
| P2 | The old world game configured 241 rounds and called them countries. | Territories and disputed entities were mixed into an undefined quiz policy. | New quiz explicitly covers 193 UN members and the two UN observers. Other features remain visible and identifiable. The help explains this choice. |
| P2 | `useFlagGameLogic.ts` allows repeated calls to `guessCountry` while feedback is visible and keeps an uncancelled delayed advance. Capital logic also schedules delayed advances. | Fast input or a restart during feedback can schedule multiple advances. | New mode uses synchronous transitions and no delayed round advance. Old modes need their own follow-up fix. |
| P2 | `useMapGameLogic.ts` increments time once per interval rather than measuring elapsed time. | Background timer throttling makes recorded durations inconsistent. | New mode measures elapsed monotonic time and pauses when hidden, paused, or a dialog is open. |
| P2 | `stores/stats.ts` refuses to record a result unless the user is logged in. Storage reads and writes are not consistently protected against browser storage errors. | Anonymous players lose statistics. Storage restrictions can break an otherwise local activity. | New mode saves best scores without an account and continues when storage is blocked. Classic persistence still needs repair. |
| P2 | `stores/auth.ts` restores a profile, token, and `is_admin` from local storage without checking expiry. | The client can show stale login/admin state. This is not an API authorization bypass because Flask rechecks signed tokens and the database. | Kept outside the new route. Follow-up should validate session state and use a deliberate token-storage policy before account features return to the new UI. |
| P2 | `db/app.py` calls `.get` directly on `request.get_json()`. JSON `null` or an array passes `request.is_json` but has no `.get`. | Malformed login requests can produce a server error before the verification handler. | Recorded for backend follow-up. The globe requires no backend. |
| P2 | `MapGame.vue` passes remote feature names to Leaflet's string `setContent`. | The map treats a data name as HTML. A compromised or changed data source could inject markup. | New mode displays names through Vue text interpolation and ships a validated local snapshot. Legacy popup text should be built as text nodes. |
| P2 | `playwright.config.ts` defaulted to `/`, while Vite served `/geography-game/`. Existing tests used absolute `/game/` navigation and fixed sleeps. Mobile projects were commented out. | The browser suite did not match the deployed URL structure or verify touch input. | New suite runs against the built deployment base and waits for observable state. The legacy browser suite is separate. |
| P3 | A `prebuild` script derived round counts from test source and edited configuration JSON. | Building could alter tracked files. Test text became a second source of product data. | Removed that build hook. New decks derive their length from actual playable countries. Legacy validation commands remain available. |
| P3 | README and quick-start material described the Vuetify scaffold. Build configuration included large blocks of disabled configuration and stale TODOs. | New contributors could not tell which architecture or commands actually applied. | Replaced entry documentation and shortened build configuration. Removed unused tooling dependencies. |

The backend uses parameterized SQL, verifies Google tokens with the configured audience, validates JWT signatures with an explicit algorithm, and checks admin rights against the database. Those are useful foundations. No critical authorization bypass was established by this review.

## Design of the new mode

`src/globe/game.ts` owns deck selection, attempts, hints, scoring, answer records, and completion. It does not import Vue or Three.js. A Fisher-Yates shuffle selects countries without repeats. Region and session length are fixed while a session is active. Display aids can change during play.

`src/globe/geography.ts` converts coordinates, prepares bounded polygon hit tests, handles holes and the antimeridian, and validates the snapshot. It prefers smaller containing polygons so an enclave is selected before its enclosing country.

`EarthGlobe.vue` owns WebGL and OrbitControls. It raycasts the visible sphere, converts the intersection into longitude and latitude, and asks the geographic picker for a country. Drag and multi-touch gestures do not count as taps. A screen-space marker hit area helps with microstates. Keyboard users can rotate, zoom, and select a center crosshair.

`GlobeGame.vue` connects the renderer to the rules. It supplies mission feedback, session settings, results, score persistence, pause, help, loading failures, and retry. The dark interface puts the Earth beside the mission on desktop and below it on phones.

Country selection uses geography rather than colors read back from the GPU. Hiding borders or answer colors therefore does not alter hit detection. The renderer stops requesting frames when idle and releases controls, listeners, textures, materials, and geometry on unmount. Pixel density is capped, and touch devices use smaller answer overlay textures.

The planet starts with a 1024 by 512 local preview while compressed geography downloads in parallel. The full 4096 by 2048 image replaces it without blocking play. Close zoom fetches NASA GIBS tiles through a bounded cache, uses a denser sphere, and reduces rotation speed with altitude. Imagery requests have a twelve-second deadline and temporary failures retry after five seconds. Vector outlines and triangulated microstate polygons preserve borders and island territory beyond the raster overlay's resolution. Small-country markers fade when their territory becomes large enough to select. Correct and wrong selections produce short visual cues, with reduced-motion preferences respected.

## Geography and scoring policy

The source snapshot is Natural Earth 5.1.2 at 1:10 million. The data generator simplifies shared boundaries once with TopoJSON and preserves the small-territory arcs on both sides of each border. This replaces the earlier mix of 50m neighbours and 10m microstates, which produced border crossings at Andorra. These tools are development dependencies and are not bundled in the game. Country metadata comes from `world-countries` 5.1.0. Source URLs and SHA-256 hashes are in `public/data/globe/sources.json`. The generator checks the expected count and finds an interior location for every quiz hint.

Natural Earth is a generalized map, not a cadastral boundary service. Some coastal city coordinates lie outside its simplified coastline. The tests use inland points, real Vatican coordinates, islands on both sides of the date line, and enclave points. The two raster overlay resolutions do not change the geometric hit test.

A sphere preserves surface-area relationships but the screen view still foreshortens places near the horizon. The help explains that the player should rotate a country toward the center. The map does not claim a universally agreed political boundary policy.

Correct guesses earn 4, 2, or 1 points by attempt. A locate hint caps the answer at 2 points. Skips and third-attempt failures earn 0. Displayed score is the floored percentage of the full session's available points. Best scores are local and grouped by region and actual session length, with display aids allowed to vary. They are personal practice scores, not a competitive leaderboard.

## Performance and verification limits

The production build separates the globe from legacy chunks. The earlier zoom build measured approximately 123 kB for the entry JavaScript and 600 kB for the globe chunk before gzip, approximately 48 kB and 155 kB after gzip. The shared-boundary country snapshot is 4,098,160 bytes, or 1,481,577 bytes with gzip. It replaces the earlier 2.11 MB snapshot, which compressed to 762 kB. Earth imagery is approximately 1.46 MB and its first-load preview is approximately 132 kB. Serve text assets with compression in production. [The validation report](validation.md) records the checks and the failures corrected during implementation.

These are measured build sizes, not a claim of a phone frame rate. Device emulation tests layout, browser behavior, and touch events; it does not reproduce a physical phone's GPU, thermal limits, memory pressure, or battery use. The Android build was also exercised on a physical Pixel 10 Pro XL, including selection, microstate zoom, gestures, orientation and offline reload. The validation report distinguishes that short observation from sustained performance measurements. Safari on an iPhone remains a release check. A WebGL 2 failure shows recovery guidance instead of an empty game.

The classic game suite still contains skips and tests that fetch external data. The new mode's unit tests and browser tests are kept separate so a passing new mode does not imply those old paths are all repaired. The legacy Flask service remains outside this verification. The new shared API, real Google login on web and Android, and SQLite migration to Cloudflare are verified in [the Atlas validation record](atlas-validation.md).

## Android path

The branch includes Capacitor 8 and an Android project under app ID `com.kmarchais.orbit`. `bun run build:android` builds with a root base into `.local/android-web`, disables service-worker registration for the native bundle, and syncs local assets into Android. Android uses the plain country snapshot because its asset merger treats a JSON file and its gzip variant as duplicates. APK compression already compresses that file.

The Android project targets SDK 36 and uses Java 21. System bars use light icons, and the interface respects safe-area insets. See [Capacitor's existing-project setup](https://capacitorjs.com/docs/getting-started) and [Android environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup). Debug installation and physical-device evidence are recorded in the validation report. Release signing and Play Store distribution remain separate work.

A native renderer or Rust/WASM should follow a measured need. A CPU-heavy geography algorithm could later move behind the existing game/geography boundary without replacing the UI.

## Next work after this mode

1. Measure sustained Android input latency, frame times, texture memory and battery use, and test Safari on physical iOS hardware. Short Pixel interaction checks already pass.
2. Choose a product policy for territories and disputed regions before adding a broader country list.
3. Keep the single 195-country challenge concise and improve it from player feedback before considering more modes.
4. Repair or retire legacy timer, feedback, popup, account, and remote-data paths as their modes migrate.
5. Monitor the implemented shared leaderboard for abuse. Correctness and ownership are server-validated; bounded client timing remains a practice-game trust decision.
