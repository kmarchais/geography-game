# Google sign-in in Atlas

Atlas's website and Android build use the same game view and account API. Other mode routes redirect to Atlas. The original mode source remains available for future work.

## Existing infrastructure

The original project already had a Google web OAuth client and a Google login component. Its Railway backend currently returns HTTP 404 with `Application not found`; access to its old database has not been established. Atlas reuses the existing OAuth project identifier and extends its running SQLite ranking database. It does not migrate or delete the old Railway database.

`server/auth.mjs` adds account, challenge, and session tables to the existing database. Google subjects identify accounts; email addresses are not account keys or stored profile fields. The server verifies ID tokens using Google's official library and checks a browser-bound nonce. Challenges expire after five minutes and can be consumed only once. Overlapping tabs and button refreshes can retain separate valid nonces.

Sessions expire after 30 days and use Secure, HttpOnly, host-only cookies. Only hashes of session and challenge-cookie secrets are stored. Google ID tokens and passwords are not persisted. Android uses Credential Manager through `AtlasGooglePlugin`, accepts the explicitly configured cross-site cookies, and flushes them for persistence. It does not embed Google's web sign-in page in the WebView.

Signed-in run ownership comes from the server session, not the client-supplied guest ID. Its best is shared across devices. Guest play remains available. After a guest completes an online run, signing in from the results screen attaches that run to the account without changing its score, time, or chosen player name. Sign-in is optional. Failed transfers can be retried from the results screen.

Each new online guest run receives a private claim token held in memory while the run is open. The database stores its SHA-256 hash. Claiming requires both that token and an authenticated account; public leaderboard IDs are insufficient. The server rejects incomplete runs and transfer to a second account, while accepting repeat requests from the original account if a response was lost. Offline runs and older guest runs without a claim token remain on the device or in the guest ranking.

Every successful first Google sign-in creates an Atlas account automatically. Completed online runs are stored in the shared SQLite database for every account; the public ranking displays each player's best. Offline practice is stored on the device.

## Configure the existing Google project

1. In Google Cloud Console, select the project that owns the existing web OAuth client.
2. Keep `https://kmarchais.github.io` in that client's Authorized JavaScript origins. The existing client accepts this origin. The website is `https://kmarchais.github.io/geography-game/`. The GIS popup flow does not need a redirect URI or client secret.
3. In the same project, create or verify an Android OAuth client for `com.kmarchais.orbit` with the signing certificate SHA-1 of the installed APK. Play App Signing will require its own certificate registration later.
4. Confirm that the audience is External if friends outside your Google Workspace organization should sign in. Basic Sign in with Google is exempt from the test-user-list restriction; requesting additional OAuth scopes can change that. See [Google's audience rules](https://support.google.com/cloud/answer/15549945?hl=en).
5. Retry Google sign-in after the settings propagate.

Deployment-specific values are in the ignored `.local/google-setup.md`. The runtime account service uses `GOOGLE_CLIENT_ID`; the current local service reads its public client ID from `.local/atlas-google-config.json`. There is no need to rebuild the app after registering the same client and certificate.

GitHub Pages serves the website while the existing ranking host serves the API. Configure allowed origins with `ATLAS_ALLOWED_ORIGINS`. `ATLAS_CROSS_SITE_ORIGINS` chooses origins requiring SameSite=None and Partitioned cookies. Both the Pages origin and native origin `https://localhost` must appear in both lists. A deployment with the website and API on one origin can use the default SameSite=Lax policy for web sessions.

See [Google web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), and [Android implementation](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).

## Verification and current blocker

Queued job 915 passes type-checking, 609 unit tests, ten HTTP tests, scoped lint, 42 desktop/phone/tablet browser tests, and Android compilation. Another 26 legacy unit tests remain skipped. Browser account flows use a simulated Google callback. The verifier tests sign JWTs with a local test key and use Google's actual cryptographic verification code to reject bad signatures, audiences, issuers, and expiry. These are not real Google-account login tests.

The new APK is installed on the Pixel. It is 14,255,200 bytes, SHA-256 `8d2f0dcacf3cd2efd5bc21558355f24486a0933e0a4e623d7c216f6a6ebd4813`; pulling the installed package back produces the same digest. The source digest is `573ffed2fef85d1d19c7e0901f14fabc3462e196bc9d7893e284616e14d7ae78`, matching the build inputs. The certificate extracted from the APK matches the fingerprint in the setup notes.

Physical verification proves the native account chooser opens and cancellation restores guest controls. A Secure, HttpOnly, SameSite=None challenge cookie persists across app-process restart using the native cookie persistence method. No Google session is claimed from these checks. A successful native account login and authenticated-session restoration still require real verification after project configuration.

The temporary laptop website was rejected by Google's origin check. The user chose the original GitHub Pages address instead. Its real Google sign-in button returns HTTP 200 without an origin error. A fresh Chromium session with third-party cookies blocked stores and reuses the API's Secure, HttpOnly partitioned challenge cookie under the Pages origin. This proves the button and challenge exchange, not a completed Google account login. Google project settings have not been changed; Android client registration and successful account login remain unverified.

Evidence is retained in `.local/atlas-auth-final-verification.json`, `.local/atlas-auth-check-status.json`, `.local/atlas-google-live-check.json`, `.local/phone/atlas-google-cancel.json`, `.local/phone/atlas-google-cookie-persistence.json`, `.local/phone/atlas-google-package-proof.json`, and `.local/atlas-google-apk-certificate.txt`.

An independent GPT-5.6-sol review requested explicit cross-site cookie policy and offline handling of retired routes. Both were fixed and covered in the final passing run. A malformed TSV record was repaired without changing its six recorded fields. Real Google consent, web/native account switching, and authenticated native session restoration remain open checks.

## Current button layout and browser permission

The account entry is now inside the start card above guest play. Web uses Google's dark pill; Android uses the matching dark native button. The iframe opts into its own light document colour scheme so its backing stays transparent on the dark page. Loading and failure states collapse the unused iframe host. The real provider button was visually checked on desktop and phone layouts, and the physical Pixel passed native layout and chooser cancellation checks. See [the latest validation](atlas-validation.md#territory-rendering-navigation-and-account-layout).

On Tailscale-enabled devices, the API hostname can resolve to a local-network address. Chrome can then block the public website's API requests until local-network permission is allowed for the website origin. On the Pixel this permission was automatically blocked. It was enabled through Chrome's site information, Permissions, Local network control, and the live ranking request then succeeded. This is separate from Google's OAuth configuration. See [Chrome's local-network access documentation](https://developer.chrome.com/blog/local-network-access).

## Guest results verification

Commit `9eb92d4` adds optional Google sign-in from guest results with transfer of the completed online run. [CI run 40372646441](https://github.com/kmarchais/geography-game/actions/runs/40372646441) passed type-checking, 620 unit tests, 11 account/ranking HTTP tests, and 57 browser tests before deploying the original website. Another 26 legacy unit tests and two mobile mouse-wheel cases were skipped. The new HTTP test covers private-token ownership, incomplete-run rejection, unchanged scores and times, safe repeated claims, and rejection of transfer to another account. The browser test covers all 195 answers, failed transfer, and successful retry. Google callbacks are simulated in browser tests; the HTTP tests use the actual cryptographic verifier with a local signing key.

Local job 973 passed scoped lint, the 11 HTTP tests, 18 desktop/phone/tablet account cases, and Android compilation. Source digest `f95e3e1ff93039e858e66db2a2e3e4388efa9788d84a56967041e291e1b769cc` matches before and after the build. The installed Pixel APK is 14,255,200 bytes with SHA-256 `ab4241db001c66fe45817fbd60717ca1ea3a273214b312b016aa5d1ad3fc42a1`; pulling the installed package confirmed the same hash. The live database upgrade preserved its three existing runs, and the public claim endpoint requires authentication. The Pixel was locked after installation, so the new native results-screen interaction and a real Google-account claim remain unverified.

Evidence is retained in `.local/atlas-guest-claim-final-verification.json`, `.local/atlas-guest-claim-check-status.json`, `.local/atlas-guest-claim-ci.log`, `.local/atlas-guest-claim-live-backend.json`, `.local/published-guest-claim-proof.json`, and `.local/phone/guest-claim-package-proof.json`.
