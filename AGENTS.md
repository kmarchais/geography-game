# Atlas development instructions

## Product

- Atlas is a geography game, not a space game. Keep the dark navy and mint interface concise.
- Web and Android share `src/views/GlobeGame.vue`. Keep the same game and account behavior on both.
- The current challenge includes all 193 UN members plus Palestine and the Holy See, represented by Vatican City. Keep the explanation behind the country-count tooltip and the exact list in Help.
- One guess per country. Correct answers, wrong answers, and skips advance immediately. Rank completed runs by correct answers, then by the elapsed time of the last correct answer.
- Google sign-in is optional before play and after a guest run. A confirmed account replaces the sign-in button and guest form. Never infer connection from choosing a Google account or receiving a token alone.
- Let players choose a username and avatar independently of their Google identity. Preserve those choices across Google logins. Only use the verified Google photo URL or validated, bounded image uploads; never accept arbitrary avatar URLs or SVG uploads.
- Do not use Claude.

## Ownership

- `src/globe/game.ts`: game rules, score ordering, and local score validation.
- `src/globe/auth.ts` and `src/components/auth/GoogleLoginButton.vue`: account state and connection UI.
- `server/auth.mjs`: Google verification, challenges, and session cookies.
- `server/ranking.mjs`: SQLite persistence, answers, ownership, and ranking.
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
- Keep machine addresses, SSH identities, device addresses, pairing codes, secrets, and host-specific API endpoints out of committed files. Use ignored local configuration and deployment variables.
- Remove temporary deployment permissions after publishing. Keep private Tailscale services private; only expose the routes explicitly authorized for Atlas.

## Machines and communication

- Read `~/.config/agents/computers.md` before choosing or using another computer. Check live availability, hardware compatibility, transfer requirements, and the selected machine's queue.
- Heavy work goes through the shared pueue `gpu` group with `qrun --progress report --interrupt restart --check-start`. Use the `gpu-queue` skill and `pueue_progress.Job`. Do not interrupt or reorder another session's work.
- Apply the `unslop` skill to user-facing prose and `write-pr-description` when writing a PR description. Keep updates concrete and separate observed results from assumptions.
- Use complete absolute paths with forward slashes when sharing local artifacts in chat. Verify that media exists on the session host before embedding it.
