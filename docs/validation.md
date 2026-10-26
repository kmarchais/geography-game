# Validation of the 3D country finder

These results cover the historical Orbit build. They do not verify the subsequent Atlas challenge and shared rankings. Current evidence is recorded in [Atlas validation](atlas-validation.md).

Verified on 25 October 2026 on Lenovo and OMEN Windows hosts. Branch `feat/3d-globe`, starting from `fb174d1`.

## Results

| Check | Result |
| --- | --- |
| Unit tests, `bun run test` | 612 passed, 26 skipped after zoom and native changes. The skips belong to legacy coverage. |
| Production browser suite, `bunx playwright test --config playwright.globe.config.ts` | 46 passed across desktop Chrome, Pixel 7 emulation, and iPad Mini emulation. Two wide-desktop cases are intentionally skipped in the touch projects. |
| Nested preview deployment | A separate production build at `/geography-game/review-preview/` passed the offline query-string reload and cache coexistence test. |
| Production build, `bun run build-only` | Passed. Globe assets and a content-versioned precache were generated. |
| TypeScript, `bun run type-check` | Passed with the updated dependency set. |
| Frozen dependency install | Passed using the declared Bun package-manager version and final lockfile. |
| Legacy configuration validation | All 28 configurations passed `bun run validate-total-rounds`, with zero warnings and zero errors. |
| Scoped ESLint check | New globe code and tests passed with `--max-warnings 0`. |
| Component style checks | New Earth component, globe view, and classic wrapper passed Stylelint. |
| Whole-project `bun run lint:check` | Exit 0, 0 errors, 204 warnings in retained legacy/tooling code. |
| Dependency audit, `bun audit --json` | `{}`, no known advisories in the final lockfile. The Capacitor CLI's transitive UUID dependency is pinned to 11.1.1, with its Xcode UUID call checked for compatibility. |
| Desktop and phone MCP configurations | Both pinned Playwright MCP servers initialized through stdio and exposed 25 tools, including navigation. |
| Manual browser inspection | Inspected desktop and phone layouts through the T3 browser MCP. Saved and opened actual screenshots. Started play and selected a hinted island through the real globe. Opened Classic games and returned to a functioning globe. Verified Saint Vincent and the Grenadines at Pixel 7 size with no title/attempt overlap or horizontal overflow. |
| Full-width hosting | The verified build is served privately through Tailscale. At a 2560-pixel viewport, the app is 2560 pixels wide and the workspace is 2432 pixels wide, with no horizontal overflow. A genuine hinted Senegal click succeeded; real NASA zoom requests completed and their rendered detail was inspected. |
| Android compilation | Capacitor 8 debug APK compiled against Android SDK 36 using Java 21. The native bundle uses a root base, local assets and no service worker. |
| Android installation and physical checks | The final 10,405,495-byte debug APK was installed through Mobile MCP on a Pixel 10 Pro XL running Android 17 with a PowerVR D-Series GPU. Physical checks during development included a hinted Romania tap scoring 2, a wrong-country tap using one attempt, and a drag preserving attempts. Portrait and landscape safe areas were checked with three-button navigation. After the scroll fix, the mission begins 67 CSS pixels below the top in portrait and 24 pixels below it in landscape, with no horizontal overflow. The final deadline and system-bar-band patch was installed afterward; its native bundle identity and computed safe-area styles were checked through the actual WebView. |
| Microstate transition and selection | A temporary deterministic shuffle selected Nauru, then the normal random function was restored. Mobile MCP started the round, used its hint, tapped zoom twelve times and tapped inside the displayed territory after the marker disappeared. The final app answered “Nauru. You found it!” and scored 2. |
| Repeated answer animation | Three real wrong-country taps produced three wrong cues and three restarted shake animations, followed by the third-attempt answer. The native WebView was instrumented to count these calls. |
| Native offline reload | With WebView networking disabled through CDP and cache bypassed, the final app loaded its bundled country snapshot and both Earth images and enabled Start. Networking was restored immediately afterward. `.local/phone/offline-cdp-trace.json` records the acknowledged disable, reload, successful result, and restore commands. Phone Wi-Fi remained connected for debugging. |
| Short frame observation | During a physical Mobile MCP drag at maximum zoom, a 3.5-second native WebView sample recorded 420 animation-frame intervals, median 8.3 ms, 95th percentile 8.4 ms and maximum 8.5 ms. This checks browser scheduling during that interaction, not GPU completion times or sustained device performance. |

The browser suite checks actual canvas clicks and taps, mouse dragging, touch dragging, two-finger pinch, zoom buttons, independent display settings, persistence, a ten-country completion, score calculation, wrong-answer cues and limits, pause, keyboard selection, modal help, data-error recovery, no third-party requests in the whole-planet view, and zero new animation frames while idle. It also blocks the large assets to prove the preview appears first, checks the wide-screen layout, and verifies detail fallback and offline-to-online tile recovery. Axe checks setup, active play, and help. The offline test installs the real worker, retains a cache belonging to another preview, goes offline, reloads a query-string URL, and answers a country.

The geography tests include all 195 hint positions, country membership and uniqueness, interior points in known countries, real Vatican coordinates, Tuvalu, Fiji, Samoa, Alaska, Greenland, Lesotho, Eswatini, polygon holes, longitude wrapping, malformed snapshots, and oceans. Detail tests cover polar longitude coverage, request bounds, rotation speed, resolution selection, marker transitions, and actual ray intersections with Vatican and Nauru territory geometry at maximum zoom.

Completed command exit codes were captured in the local `.local/verification-status.json` artifact. Saved screenshots and full command logs are under `.local` in this workspace. They are working verification artifacts, not required application assets.

The final Android and zoom run used Bun 1.2.20 in the OMEN shared queue. `.local/final-android-checks.json` records the completed job and APK hash, and `.local/verification-android.log` contains that run's output. It includes frozen install, TypeScript, 612 unit passes, scoped lint and style checks, dependency audit, Xcode UUID compatibility, both web builds, Gradle APK compilation, and 46 browser passes. Each command's exit status is checked by the job before proceeding.

The build recorded matching source manifests before and after compilation. The expanded manifest includes type and lint configuration. Local and remote source hashes match. `.local/source-provenance.json` records the build archive hash, build-recipe hash and 246 byte-for-byte comparisons against the archived build inputs. Two later verification-only changes strengthened the timeout URL assertions and expanded the manifest's root file list; all five terrain tests and their lint check passed again. No application source changed in that follow-up.

The final APK SHA-256 is `58856c5f937f4724aea111f80fb44a19d61c3bcd3ce30ab6e9732bf5d8236a1c`. The current source manifest SHA-256 is `874eb524ba38163d3a754d9e24d8b858736ae9e570b7dd4ca334cc88e1c1643b`. Capacitor's generated Cordova XML was included in both local and remote manifests; its hash is recorded separately in the provenance file.

## Failures found and corrected

- The first geographic tests found offshore label positions and overlapping enclave geometry. Hint positions now lie inside their country. Small-country polygons use higher-resolution Natural Earth data.
- A coastal Tuvalu test point was outside the atoll's land polygon. The test now uses a known point on the atoll. Water still does not count as land.
- The first session-length browser test found an ambiguous form label. Selectors now have explicit accessible labels.
- Independent Codex review caught a score assertion that could match the timer. The test now checks the score element and expects 2 out of 100 for a hinted first answer in twenty rounds.
- A texture downsampling change exposed an updated Three.js type constraint. The texture's permitted image types are explicit.
- Axe found that the logo's accessible name omitted part of its visible text. The link now uses its natural text name.
- A real offline reload failed because the preview host added `Vary: Origin` to synthetic precache responses. The worker now ignores that variance only for its public precached assets.
- Review found cross-scope cleanup of legacy caches. Only the main deployment migrates the old generic main cache names.
- Review found that the first mobile rotation test used mouse events. It now dispatches real touch pointers and a multi-touch pinch in the mobile projects.

## Reproduce the preview-path test

In PowerShell:

```powershell
$env:BASE_URL = '/geography-game/review-preview/'
bun run build-only --outDir .local/preview-dist
$env:GLOBE_BASE_URL = '/geography-game/review-preview/'
$env:GLOBE_TEST_PORT = '4176'
$env:GLOBE_OUT_DIR = '.local/preview-dist'
bunx playwright test --config playwright.globe.config.ts --project desktop --grep offline
```

Use a fresh shell for normal default-base builds afterward.

## Remaining release checks

A debug Android APK has been built, installed, and exercised on a physical Pixel. Physical checks cover real taps, dragging, zoom buttons, two-pointer WebView touch events, microstate selection, repeated wrong cues, offline reload and orientation. Gesture-navigation mode was not enabled on the phone; its existing three-button navigation was retained. Safari, iOS, release signing and Play Store packaging remain untested. Sustained thermal, GPU-memory and battery measurements have not been performed.

The worker's fresh install, offline query navigation, and nested deployment scope were exercised. A deployed old-worker-to-new-worker lifecycle with already-open production tabs still needs a release rehearsal. GPU context-loss restoration and long route-cycle memory measurements are also follow-up checks.

The old remote-data games and production Flask/OAuth/database service were not exhaustively exercised. Their source findings remain in [the project review](project-review.md). The new mode requires none of those services.
