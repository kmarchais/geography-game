# Atlas development instructions

## Product

- Atlas is a geography game, not a space game. Keep the dark navy and mint interface concise.
- Web and Android share `src/views/GlobeGame.vue`. Keep the same game and account behavior on both.
- The current challenge includes all 193 UN members plus Palestine and the Holy See, represented by Vatican City. Keep the explanation behind the country-count tooltip and the exact list in Help.
- Give three attempts per country. Correct answers and skips advance immediately. After a third wrong guess, rotate and zoom smoothly to the red territory, then advance. Pause timing only during that automatic reveal. Rank the new rules separately from legacy one-guess runs.
- Start with a centered Play button and no nickname or sign-in prompt. Hide globe buttons. Keep a live ranking on the left on wide web screens, never in the native app. The canvas fills the area from the header border to the bottom safe area.
- Save completed unnamed runs and aggregate country outcomes. Publishing a nickname or attaching a run to Google is optional and offered at the end. New anonymous runs must not retain a stable guest identity. Account statistics are private; global statistics expose only country counters. Keep local statistics for guests.
- Use a random preset avatar for the guest menu in the top-right header. Offer Google sign-in inside that menu before a run and directly on the results card afterward. A confirmed account shows its profile picture, which opens the shared menu for profile editing, sign-out, statistics, Help, and bug reports. Account changes stay disabled during a run. Never infer connection from choosing a Google account or receiving a token alone.
- Let players choose a username and avatar independently of their Google identity. Preserve those choices across Google logins. Only use the verified Google photo URL or validated, bounded image uploads; never accept arbitrary avatar URLs or SVG uploads.
- Do not use Claude.
- Keep visible text and accessibility labels in the typed English and French catalogs in `src/globe/locales`. Detect French from the primary system language and use English otherwise. Translate country names by ISO ID; never translate score IDs, usernames, or user-submitted reports. Keep catalog keys and interpolation parameters identical.

## Ownership

- `src/globe/game.ts`: game rules, score ordering, and local score validation.
- `src/globe/auth.ts` and `src/components/auth/GoogleLoginButton.vue`: account state and connection UI.
- `server/auth.mjs`: Google verification, challenges, and session cookies.
- `server/api.mjs`: shared answers, ownership, and ranking rules.
- `server/ranking.mjs`: Node HTTP and local SQLite hosting.
- `server/cloudflare.mjs`: Worker transport, SQLite Durable Object adapter, and report alarms.
- `src/globe/geography.ts`, `detail.ts`, and `terrain.ts`: geography, picking, and imagery.
- `src/components/EarthGlobe.vue`: Three.js rendering and input.
- `public/atlas.svg`: editable icon source. Run `bun run icons` to regenerate web and Android images. Keep the themed Android vector consistent.
- Retired game modes remain in source. Do not expose them or rewrite them as part of an unrelated fix.

## Account and data integrity

- Use the server session as the authenticated identity. Keep credentials in Secure, HttpOnly cookies; never put Google tokens or session secrets in local storage, logs, or screenshots.
- Verify the Google signature, audience, issuer, expiry, and browser-bound nonce. Keep replay protection.
- A successful login must be confirmed by `/auth/session`. Show an explicit status for a connection that was cancelled, failed, or did not retain a session.
- Google can return a cancellation exception for a configuration failure. Do not silently discard it or automatically reopen the chooser.
- Guest score claims require the private token issued at run creation and an authenticated account. Keep claims idempotent, reject incomplete runs, and prevent transfer to another account.
- Bug reports are saved before GitHub publication. Keep retry IDs, public-posting notice, rate limits, and duplicate recovery. Never include account credentials, photos, email addresses, or private host addresses in report context. Browser/API tests must inject or mock the publisher and must not create live GitHub issues.
- Preserve `.local/atlas.sqlite` across builds and deployments. Use SQLite's backup API before a schema change on a running installation.
- The site, API, and shared SQLite database run on Cloudflare Free. Do not activate a paid plan or replace the legacy Railway PostgreSQL volume. Keep the original local SQLite migration checkpoint. The old API route is a compatibility proxy to Cloudflare, not another writable database. Track deployment and rollback constraints in `docs/free-hosting.md`.
- Never claim that a mocked Google callback proves real account login. Record browser, native, and provider verification separately.

## Changes and verification

- Prefer existing helpers, browser features, and small changes. Add a regression check for new branching logic and bugs.
- Use Node 24.15 or newer, Bun 1.2.20, and the frozen lockfile. Android needs Java 21 and SDK 36.
- Run checks appropriate to the change: `bun run type-check`, `bun run test`, `bun run test:ranking`, and scoped ESLint. `bun run test:globe` builds production assets and tests desktop, phone, and tablet profiles with an isolated API.
- The legacy `test:e2e` suite describes the retired interface. Some legacy unit tests remain skipped. Report those skips.
- Native builds require an absolute HTTPS `VITE_ATLAS_API_URL`. Build with `bun run build:android`, then the checked-in Gradle wrapper. Keep package ID `com.kmarchais.orbit` so updates preserve device data.
- Verify the installed APK and actual UI. Do not replace physical checks with screenshot file sizes, compilation, or emulation. Do not bypass a locked device. Restore device settings and remove temporary test scores after testing.
- Preserve the shared geography boundaries used by rendering and picking. Do not regenerate geography during a normal build.
- Update relevant documentation and append material decisions to `docs/decisions.tsv`. Keep verification evidence in ignored `.local` files and distinguish pending work from successful checks.

## GitHub and deployment

- Use only the `kmarchais` GitHub account. Before GitHub-backed operations, run `gh auth switch --hostname github.com --user kmarchais` and `gh auth status --hostname github.com`.
- Work on the feature branch unless instructed otherwise. Do not overwrite `main` or commit generated website bundles.
- GitHub Actions publishes the original Pages website from a verified build artifact. The ranking API runs separately. Keep its database and service alive during static deployments.
- Cloudflare deployments use the verified root web artifact and `wrangler.jsonc`. Preserve configured Google/CORS variables with `--keep-vars` when deploying from the root configuration. GitHub issue credentials belong only in Worker secrets. Never expose a database import/export route in the normal Worker.
- Keep machine addresses, SSH identities, device addresses, pairing codes, secrets, and host-specific API endpoints out of committed files. Use ignored local configuration and deployment variables.
- Remove temporary deployment permissions after publishing. Keep private Tailscale services private; only expose the routes explicitly authorized for Atlas.

## Machines and communication

- Read `~/.config/agents/computers.md` before choosing or using another computer. Check live availability, hardware compatibility, transfer requirements, and the selected machine's queue.
- Heavy work goes through the shared pueue `gpu` group with `qrun --progress report --interrupt restart --check-start`. Use the `gpu-queue` skill and `pueue_progress.Job`. Do not interrupt or reorder another session's work.
- Apply the `unslop` skill to user-facing prose and `write-pr-description` when writing a PR description. Keep updates concrete and separate observed results from assumptions.
- Use complete absolute paths with forward slashes when sharing local artifacts in chat. Verify that media exists on the session host before embedding it.
