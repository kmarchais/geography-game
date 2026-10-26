# Atlas

Find all 195 countries on a 3D Earth. One guess per country. Correct answers, wrong answers, and skips advance immediately. The clock runs continuously. Shared rankings sort by percentage correct, then by the time of the last correct answer.

The [exact quiz list](docs/country-list.md) is the 193 UN member states plus Palestine and the Holy See, represented geographically by Vatican City. This is a membership-based selection, not a claim about universal diplomatic recognition.

Drag to rotate, scroll or pinch to zoom, and tap land to answer. Small-country markers help with islands. Keyboard controls are arrow keys, +/−, and Enter to select the center. Help contains the instructions and map credits.

## Run locally

Use Node 24.15 or newer and Bun 1.2.20.

```sh
bun install --frozen-lockfile
```

Start `bun run ranking` in one terminal and `bun run dev` in another. Open http://localhost:3000/geography-game/. Vite proxies `/atlas-api` to the ranking service on loopback port 4178. WebGL 2 is required. Globe, country data, and fonts are local assets. Sharper imagery downloads as you zoom.

The ranking service stores `.local/atlas.sqlite`. Back it up with SQLite's backup API or while the service is stopped. Keep it when updating web assets. `ATLAS_DB`, `ATLAS_PORT`, and comma-separated `ATLAS_ALLOWED_ORIGINS` configure the service.

## Host the game

Build with `bun run build`, then keep `bun run ranking` running independently of the build terminal. Serve `dist` over HTTPS and proxy `/atlas-api` to `http://127.0.0.1:4178`. Allow the exact HTTPS origin through `ATLAS_ALLOWED_ORIGINS`.

For Tailscale Serve, configure a static route to `dist` at `/geography-game` and a proxy route at `/atlas-api`. Keep machine addresses in local configuration. Players need access to the tailnet and the host must stay awake. Public hosting requires a public HTTPS origin and the same API route.

The original GitHub Pages website uses the `Build and Deploy` workflow. Set the `ATLAS_API_URL` repository variable to the reachable HTTPS API endpoint, select GitHub Actions as the Pages publishing source, and run the workflow on the branch to publish. It uploads a build artifact instead of committing generated assets or machine addresses to `gh-pages`. Pull requests run checks without publishing or contacting the live ranking API. A `404.html` app shell handles old route bookmarks.

For a separately hosted API, add the website origin to both `ATLAS_ALLOWED_ORIGINS` and `ATLAS_CROSS_SITE_ORIGINS`. Cross-site account cookies are Secure, HttpOnly, SameSite=None, and Partitioned, so modern browsers can preserve account state while blocking ordinary third-party cookies. Keep the API host running for accounts and shared rankings; the static game stays on GitHub Pages.

Each guest identity contributes its best completed run to the top 20. Names do not reserve accounts. Clearing local storage creates another identity. The server checks the deck, answer order, country membership, and time bounds, and calculates correctness. Client timing remains trusted within those bounds, so this is a practice leaderboard, not a fraud-resistant competition.

If the API is unavailable when a run starts, play continues unranked. Completed runs stay in the device's personal best list when storage is available. Answer uploads retry transient failures twice with the same request. Exhausted retries leave the shared result unconfirmed and preserve the local score.

## Verify changes

```sh
bun run type-check
bun run test
bun run test:ranking
bun run lint:check
bunx playwright install chromium
bun run test:globe
```

The globe suite starts its own in-memory ranking service and tests production assets in desktop, Pixel, and tablet profiles. It covers canvas selection, immediate advancement, touch rotation and pinch, continuous timing, a complete 195-country run, lost acknowledgements after server commit, local bests, offline behavior, accessibility, and idle rendering. Emulation does not replace physical testing.

Web and Android use the same Atlas screen. Other modes and settings are hidden; old mode bookmarks redirect to Atlas, including offline after installation. Their source remains in the repository. The old `bun run test:e2e` suite describes the retired interface. Some legacy component and external-data unit tests remain skipped. `RUN_REMOTE_TESTS=true` enables external-data checks.

## Connect a Google account

Set `GOOGLE_CLIENT_ID` on the ranking service to your Google OAuth web client ID. Register each website origin in that client's authorized JavaScript origins. For Android, register an Android OAuth client in the same Google project using the package ID and the installed app's signing-certificate SHA-1. The native account chooser uses the web client ID supplied by the server. No Google client secret is needed.

Google sign-in is optional. The server verifies the ID token and a browser-bound, expiring nonce before issuing an opaque session cookie. Session cookies are Secure and HttpOnly. The SQLite database stores account identifiers, display names, hashed session tokens, and scores; it does not store Google passwords, ID tokens, or email addresses. A connected player's best score is shared across web and Android. Existing guest scores stay under their guest identity; sign-in does not claim arbitrary old guest runs.

For a same-origin host, proxy the API under the website origin. For GitHub Pages, use the separately hosted API and explicitly allow the website origin. `ATLAS_ALLOWED_ORIGINS` controls credentialed CORS. `ATLAS_CROSS_SITE_ORIGINS` explicitly selects origins needing SameSite=None cookies, defaulting to Capacitor's `https://localhost`. Add a custom native origin to both settings if you change Capacitor's hostname. The Android WebView accepts these cookies; other browsers can impose additional third-party-cookie restrictions. Sign out revokes the current session.

The old Google client ID can be reused, but the original Railway application is no longer reachable. Atlas uses the existing ranking SQLite database for its accounts. This does not migrate data from the old Railway database.

## Build Android

Use Java 21, Android SDK 36, Node 24.15 or newer, and the checked-in Gradle wrapper. Set `JAVA_HOME`, `ANDROID_HOME`, and `VITE_ATLAS_API_URL` to a reachable HTTPS ranking endpoint. Native builds fail if that endpoint is missing.

```sh
bun run build:android
cd android
./gradlew assembleDebug
```

On Windows use `gradlew.bat`. Install `android/app/build/outputs/apk/debug/app-debug.apk` with `adb install -r` or Mobile MCP. The display name is Atlas; the package ID remains `com.kmarchais.orbit` to preserve updates and data. Core assets are bundled for offline play. Rankings and detailed imagery need connectivity. Store releases still need release signing and an Android App Bundle.

## Test through MCP

`.mcp.json` provides pinned Playwright MCP desktop and phone profiles, plus Mobile MCP for physical devices. Install Android platform-tools and pair the phone through Wireless debugging. Check `adb devices` before testing. Keep device addresses and pairing credentials outside version control. Stay awake keeps a charging phone available; it does not schedule tests or bypass the lock screen.

## Code ownership

- `src/globe/game.ts`: rules, score ordering, and local best validation.
- `src/globe/ranking.ts` and `server/ranking.mjs`: HTTP client and SQLite service.
- `src/globe/geography.ts`, `detail.ts`, and `terrain.ts`: picking and imagery.
- `src/components/EarthGlobe.vue`: Three.js and input.
- `src/views/GlobeGame.vue`: challenge UI and session lifecycle.
- `tests/globe` and `tests/server`: browser and HTTP integration tests.

Read [asset provenance](docs/assets.md), [the original architecture review](docs/project-review.md), and [Atlas validation](docs/atlas-validation.md). The append-only [decision trail](docs/decisions.tsv) records the redesign. Do not regenerate geography during a normal build.
