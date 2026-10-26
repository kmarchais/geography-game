# Google sign-in in Atlas

Atlas's website and Android build use the same game view and account API. Other mode routes redirect to Atlas. The original mode source remains available for future work.

## Existing infrastructure

The original project already had a Google web OAuth client and a Google login component. Its Railway backend currently returns HTTP 404 with `Application not found`; access to its old database has not been established. Atlas reuses the existing OAuth project identifier and extends its running SQLite ranking database. It does not migrate or delete the old Railway database.

`server/auth.mjs` adds account, challenge, and session tables to the existing database. Google subjects identify accounts; email addresses are not account keys or stored profile fields. The server verifies ID tokens using Google's official library and checks a browser-bound nonce. Challenges expire after five minutes and can be consumed only once. Overlapping tabs and button refreshes can retain separate valid nonces.

Sessions expire after 30 days and use Secure, HttpOnly, host-only cookies. Only hashes of session and challenge-cookie secrets are stored. Google ID tokens and passwords are not persisted. Android uses Credential Manager through `AtlasGooglePlugin`, accepts the explicitly configured cross-site cookies, and flushes them for persistence. It does not embed Google's web sign-in page in the WebView.

Signed-in run ownership comes from the server session, not the client-supplied guest ID. Its best is shared across devices. Guest play remains available. Existing guest runs are not silently transferred to a Google account.

## Configure the existing Google project

1. In Google Cloud Console, select the project that owns the existing web OAuth client.
2. Add the deployed website's exact HTTPS origin, including a non-default port, to that client's Authorized JavaScript origins. Do not include the game path. The GIS popup flow does not need a redirect URI or client secret.
3. In the same project, create or verify an Android OAuth client for `com.kmarchais.orbit` with the signing certificate SHA-1 of the installed APK. Play App Signing will require its own certificate registration later.
4. If the consent audience is in Testing, check access for the intended testers.
5. Retry Google sign-in after the settings propagate.

Deployment-specific values are in the ignored `.local/google-setup.md`. The runtime account service uses `GOOGLE_CLIENT_ID`; the current local service reads its public client ID from `.local/atlas-google-config.json`. There is no need to rebuild the app after registering the same client and certificate.

The website and API should share an HTTPS origin. Configure allowed origins with `ATLAS_ALLOWED_ORIGINS`. `ATLAS_CROSS_SITE_ORIGINS` chooses origins requiring SameSite=None, defaulting to the native origin `https://localhost`. A custom native origin must appear in both lists.

See [Google web setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), and [Android implementation](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).

## Verification and current blocker

Queued job 915 passes type-checking, 609 unit tests, ten HTTP tests, scoped lint, 42 desktop/phone/tablet browser tests, and Android compilation. Another 26 legacy unit tests remain skipped. Browser account flows use a simulated Google callback. The verifier tests sign JWTs with a local test key and use Google's actual cryptographic verification code to reject bad signatures, audiences, issuers, and expiry. These are not real Google-account login tests.

The new APK is installed on the Pixel. It is 14,255,200 bytes, SHA-256 `8d2f0dcacf3cd2efd5bc21558355f24486a0933e0a4e623d7c216f6a6ebd4813`; pulling the installed package back produces the same digest. The source digest is `573ffed2fef85d1d19c7e0901f14fabc3462e196bc9d7893e284616e14d7ae78`, matching the build inputs. The certificate extracted from the APK matches the fingerprint in the setup notes.

Physical verification proves the native account chooser opens and cancellation restores guest controls. A Secure, HttpOnly, SameSite=None challenge cookie persists across app-process restart using the native cookie persistence method. No Google session is claimed from these checks. A successful native account login and authenticated-session restoration still require real verification after project configuration.

The real Google web SDK reports `The given origin is not allowed for the given client ID.` The managed Cloud Console browser requires a Google login, and no other connected browser session was available. Google project settings have not been changed. Real account sign-in remains blocked on the configuration above.

Evidence is retained in `.local/atlas-auth-final-verification.json`, `.local/atlas-auth-check-status.json`, `.local/atlas-google-live-check.json`, `.local/phone/atlas-google-cancel.json`, `.local/phone/atlas-google-cookie-persistence.json`, `.local/phone/atlas-google-package-proof.json`, and `.local/atlas-google-apk-certificate.txt`.

An independent GPT-5.6-sol review requested explicit cross-site cookie policy and offline handling of retired routes. Both were fixed and covered in the final passing run. A malformed TSV record was repaired without changing its six recorded fields. Real Google consent, web/native account switching, and authenticated native session restoration remain open checks.
