# Atlas validation

The Atlas challenge replaces Orbit's expedition settings. Historical Orbit results in `validation.md` do not verify the new mode or ranking service.

## Three-attempt challenge, 27 October 2026

Source `28bebbd158a824bd0baaf7941a0cc36f311bb5f7` adds the minimal Play screen, optional result publication, global and private country counters, and three attempts. The third wrong guess rotates and zooms to a red territory, pauses briefly, and advances. The chronometer excludes this forced reveal. These rules use ranking version 3; existing version 2 scores remain stored separately.

[Focused workflow 40535203683](https://github.com/kmarchais/geography-game/actions/runs/40535203683) passed the browser regression for three attempts, paused time, actual red canvas pixels, and progression. It also passed the minimal-layout and completed-run publication cases. The full desktop, phone, tablet, Android, and Worker verification is [workflow 40538700085](https://github.com/kmarchais/geography-game/actions/runs/40538700085). The corrected build passed and was published on Cloudflare and at the original Pages address. The Pages deployment was deliberately held until the API update completed, then retried successfully. Physical validation remains pending because the Pixel is locked.

The APK source manifest matches all 302 build inputs to the committed source, including the generated Capacitor configuration. The signed APK is 10,976,274 bytes, SHA-256 `ec11df5a039b137d36a6ce47f1f46db2b9fa018a304c1c5b18e196b4f4ac2fe0`. Source proof is retained in `.local/atlas-minimal-source-proof.json`.

Before migration, a read-only Cloudflare SQL query captured all five application tables in one consistent SELECT. The archive was reconstructed as SQLite and its row counts verified. `.local/atlas-cloud-before-stats-proof.json` records the digest and zero source writes. No database export endpoint was added. The original local SQLite migration checkpoint remains unchanged.

Guest runs use a different anonymous owner per run until the player explicitly publishes a nickname or claims the run through Google. Only aggregate country counters are public. Private account counters require the server session. Integration tests verify retries do not duplicate counters and one account cannot read another account's private results. Local guest statistics are separate from shared account statistics.

### Final checks for source 28bebbd

| Check | Result |
| --- | --- |
| Frozen install, scoped lint, type-check | Exit 0 |
| Unit suite | 631 passed, 26 legacy skips |
| Shared API suite | 24 passed, one opt-in Worker test skipped |
| Actual isolated Cloudflare runtime | Passed separately in the hosting job |
| Desktop, phone, tablet browser suite | 91 passed, two mouse-wheel cases skipped on touch profiles |
| Production container and minimal UI | Passed |
| Android compile and source manifest | Passed; all 302 inputs match committed source |
| Published Cloudflare assets and API | Nine artifact files match; Google configured; native CORS accepted; private statistics require a session |
| Original Pages website | Published build and source assets match 28bebbd |
| Existing database | Accounts, sessions, reports, and all three legacy runs preserved; two expired nonce challenges renewed normally |
| Installed Pixel app | Pending unlock; this APK has not been installed or physically exercised |

Evidence: `.local/atlas-minimal-ci-status.json`, `.local/atlas-minimal-final-ci.log`, `.local/atlas-minimal-source-proof.json`, `.local/atlas-minimal-apk-proof.json`, `.local/atlas-minimal-apk-signature.txt`, `.local/atlas-minimal-deployment-proof.json`, `.local/atlas-minimal-migration-proof.json`, and `.local/atlas-published-28bebbd.json`. The complete immutable browser report is retained in `.local/minimal-browser-report-final/`. Final screenshots include `.local/visual/atlas-final-desktop-start-2560.png` and `.local/visual/atlas-final-phone-red-reveal-1082.png`; both were visually inspected.

The separate gpt-6-astra review found a stale wide-native grid rule and account outcomes copied into guest counters. Both were corrected before release. Browser regressions now verify a full-width native layout at desktop-window width and guest-statistic isolation after sign-out. The first broad run passed 85 cases but failed three drag cases because the new Play button intercepted the old start-screen test. Starting the game before the drag fixes the test without weakening its redraw assertion.

No synthetic run, score, report, or country statistic was created in production during these checks. The database comparison uses read-only snapshots. Google provider login was verified in the preceding release; this update does not claim a fresh real-provider or physical-phone test. Native installation and interaction remain pending, along with the previously disclosed Safari, iOS, release-signing, sustained thermal, context-restoration, and long memory-cycle checks.

## Initial Atlas verification

Verified on 26 October 2026 on Lenovo and a Pixel 10 Pro XL running Android 17. Final queued verification job 888 passed, including the result-screen rotation regression.

| Check | Result |
| --- | --- |
| Frozen dependency install | Exit 0, unchanged lockfile reused for the final run |
| TypeScript | Exit 0 |
| Unit tests | 609 passed, 26 legacy tests skipped, exit 0 |
| Ranking HTTP integration | 5 passed, exit 0 |
| Scoped ESLint | Exit 0 |
| Production web build | Exit 0 |
| Desktop, Android, and tablet browser tests | 33 passed, exit 0 |
| Private hosting and API health | HTTPS 200; API permits the native WebView origin |
| Android debug build | Exit 0; version 1.1, version code 2 |
| Native shared ranking | Final APK submits 195 answers; one correct; server and client both report 11911 ms |
| Physical gestures and feedback | Drag and two-touch pinch do not answer; two wrong taps and one correct tap create separate cues |
| Native offline startup | Local globe loads; Skip advances to 2 / 195; UI says unranked |

The physical test used Mobile MCP for installation, launch, text entry, taps, drag, orientation, and screenshots. CDP sent the two-touch pinch and recorded requests from this app's WebView. Automated skips advanced the rest of the 195-country deck; this was not a manual 195-country playthrough. The offline trace records acknowledged network disabling and restoration. The phone's three-button navigation was tested. Gesture navigation remains unverified.

The first install encountered a debug-signature mismatch. The original app's data and APK were retained locally before replacement. Saved game settings and the 92% Europe best were restored and checked. Stay awake remains enabled with its original value of 15. Only recorded host/device test runs were removed from the shared database; existing player data was preserved.

Physical evidence is retained in `.local/phone/atlas-ranking-proof.json`, `atlas-shared-ranking.json`, `atlas-pinch-trace.json`, `atlas-offline-trace.json`, `atlas-offline-start.json`, and the portrait, landscape, and ranked-result screenshots in the same directory.

The final APK's evidence uses the `atlas-final-` prefix in that directory. `atlas-final-ranking-proof.json` records the exact event time and server result. `atlas-final-result-portrait.json` records the completed-score heading at 93 px with a 67 px top inset; `atlas-final-result-landscape.json` records 24 px with a 24 px inset. The final offline trace includes both network-state acknowledgements. `atlas-package-proof.json` compares an APK pulled back from the phone with the verified artifact.

The full gameplay and rotation verification above used an APK of 10,277,637 bytes. Its SHA-256 is `c7041306d7af85c1eafed33f3d816e90d09e458fa8d70aff71dc369071286dc3`. The installed APK has the same digest. The source manifest digest is `1d2dc34e9bc0642b07fd45172cb9f878a3524e037b9a763069e5d7fdd75f01d3`; manifests before and after the build match. `.local/atlas-final-verification.json` also records the verification recipe digest and confirms the native API endpoint is bundled. Deployment addresses remain outside version control.

The browser suite completes a real 195-country run with a correct canvas selection, drops the final response after the server commits it, and verifies an identical retry and the exact time-to-score. It also checks immediate skips, stored-identity repair, persistent personal bests, gestures, offline behavior, keyboard input, and accessibility. The API tests independently cover ordering, timing bounds, replay, persistence across restart, and cross-client ranking.

An earlier parallel unit run exposed a self-triggering timestamp update in the legacy statistics store. The timestamp now updates in the scoring action, and a changing-clock regression test covers the watcher. An initial browser run failed two clock assertions because real time advanced between actions. The corrected test pauses the test clock before starting play. The complete browser suite then passed.

Local machine evidence is retained in `.local/atlas-check-status.json`, `.local/atlas-verification.log`, `.local/atlas-host-check.json`, and `.local/screenshots/atlas-desktop.png`. These files are ignored because they contain local deployment and device details.

The independent Atlas review identified latency-sensitive ranking times, missing upload retries, an unset native API endpoint, an input delay, malformed stored identities, and inaccessible local results. The implementation addresses all six findings, and the unit, HTTP, and production browser checks above pass.

## Release limits

The private host is shared between authorized tailnet players. Guest identities are device-local and the server accepts bounded client event times. This is a practice ranking, not an authenticated competition. A public release needs hosting and an abuse policy appropriate to its audience.

Safari and iOS, release signing, Play Store packaging, WebGL context restoration, long route-cycle memory, sustained thermal behavior, GPU completion time, and battery use remain unverified. The 500 m source imagery and generalized Natural Earth coastlines do not provide survey-level close-zoom boundaries.

## Country-list clarification

On 26 October 2026, the quiz snapshot was compared with all 193 headings in the official UN member-state directory plus its two non-member observer states. Common-name aliases were mapped explicitly, including Holy See / Vatican City. No entries were missing or extra. The exact list is in [country-list.md](country-list.md); the comparison evidence is `.local/country-list-check.json`.

The home subtitle now explains the 193 + 2 count, and Help contains the membership explanation, official sources, and a collapsed complete list. Queued job 905 passes type-checking, 25 geography tests, scoped lint, web and Android builds, and six focused desktop/phone/tablet browser checks. The previously recorded full gameplay suite was not rerun for this text and list change. The updated APK was installed on the Pixel; its expanded list contains exactly the 195 snapshot names, with no horizontal overflow. Evidence is `.local/phone/atlas-country-list-proof.json` and `.local/phone/atlas-country-list.png`.

The current retained APK is `.local/artifacts/Atlas-debug.apk`, 10,277,637 bytes, SHA-256 `d970489dcbddb2647bde59a32a3f1c08696688253ecd94982651f3b45f55df71`. Its source digest is `1c827826d86d219e0ab374d06a7cf734f98446350d1befb714f475f72f45bdf3`. `.local/atlas-country-copy-verification.json` records matching source manifests and the bundled native ranking endpoint.

## Free public friend link

On 26 October 2026, Tailscale Funnel was enabled on the existing Atlas port, 8443. That port has only the static game route and ranking API route. The separate service on port 443 remains tailnet-only. The host must stay awake with Tailscale and the ranking service running. No app-store account or installation is needed for browser players.

The public route was verified using a public DNS resolver and forced public relay addresses, bypassing tailnet DNS and direct mesh routing. The game, API health check, and leaderboard each return HTTP 200. A fresh Pixel-profile browser, also forced through the public relay, loads the game, starts a server-generated 195-country deck, and successfully submits an answer. It advances to 2 / 195 without an offline warning or page errors. Queued check 911 passes. The two incomplete test runs were removed by their recorded test name and IDs.

Evidence is retained in `.local/atlas-public-network-proof.json`, `.local/atlas-public-browser-proof.json`, `.local/atlas-public-test-cleanup.json`, and `.local/screenshots/atlas-public-phone.png`. The preceding private route configuration is saved in `.local/tailscale-before-atlas-funnel.json`. Deployment addresses remain outside version control.

## Shared interface and Google accounts

The later Google account build supersedes the preceding retained APK. Web and Android now expose one Atlas view; retired routes redirect to it, including offline. Online refreshes use the current interface while active games are not automatically reloaded.

Queued job 915 passes 609 units, ten HTTP tests, 42 browser cases, type-checking, lint, and Android compilation. The updated APK is installed and its pulled hash matches the retained `.local/artifacts/Atlas-debug.apk`. See [Google sign-in](google-sign-in.md) for the current package and source digests, the physical chooser/cancellation/cookie checks, and the exact distinction between simulated account testing and real provider testing.

The temporary website origin was rejected by Google. The original GitHub Pages origin is accepted, as verified below. Native account registration and authenticated-session restoration have not been proven. The current shared-ranking database is reused; the original Railway database was not accessed or migrated. Guest play remains available.

## Original website deployment

Commit `f781b2549c75b0377d6658ddfa3b83d91a67ee09` was deployed to [the original website](https://kmarchais.github.io/geography-game/) by [Actions run 40334751571](https://github.com/kmarchais/geography-game/actions/runs/40334751571). Both build and deploy passed. The workflow checks the country count, types, units, HTTP API, and browser suite before producing the Pages artifact. The API endpoint comes from a repository variable and is not committed in generated assets.

A fresh live Chromium session loads Atlas, starts a server-generated 195-country run, and advances after Skip. The real Google button returns HTTP 200 without origin errors. With third-party cookies blocked, the API challenge cookie is Secure, HttpOnly, SameSite=None, and partitioned under the Pages origin. An old `/europe` bookmark redirects to Atlas through the deployed 404 fallback. These checks do not claim successful Google account login. Evidence is retained in `.local/pages-live-proof.json` and `.local/pages-origin-proof.json`.

The temporary feature-branch permission was removed after deployment. The Pages environment again allows only `main` and `gh-pages`. Pages serves the game independently of the API host; accounts and shared ranking require that host to remain available. A GPT-5.6-sol review checked the deployment and cookie changes. Its branch restriction and documentation findings were addressed.

## Territory rendering, navigation, and account layout

Commit `272afa7b26f8775d455f9b1a56dc5b0a7ce20a48` is deployed at the original website by [Actions run 40351523765](https://github.com/kmarchais/geography-game/actions/runs/40351523765). Build and deployment passed. The temporary feature-branch deployment permission was removed afterwards.

Small territories no longer receive a green surface before an answer. The Atlas challenge keeps all countries unpainted. Shared Natural Earth boundaries replace the mismatched microstate and neighbour geometry. The snapshot is 4,098,160 bytes, or 1,481,577 bytes compressed. Spatial border batches preserve every segment and reduce the border vertices submitted for a representative zoomed view to below ten percent of the world geometry. The horizon test includes the raised border shell. A regression covers an island border beyond the ground tangent.

Dragging now redraws camera changes below OrbitControls' event threshold. Wheel zoom retains the country under the cursor, tested by zooming from the whole planet to Andorra and selecting it at the same mouse position. The account button sits above guest entry, uses a dark pill, adapts to the form width, and has no empty loading row. A real Google iframe check verifies its transparent backing with a dark corner pixel of RGB 9, 15, 19.

Queued job 952 passes type-checking, scoped lint, 620 unit tests, ten HTTP tests, 55 browser cases, production builds, and Android compilation. Twenty-six legacy unit tests remain skipped. Two browser cases intentionally skip mouse-wheel testing on touch profiles. An earlier run caught a loading-button locator race; CI then exposed a tablet test timeout under software rendering. The final drag test isolates imagery requests and uses eight input samples. The final local and CI runs pass.

The final APK is 14,255,200 bytes, SHA-256 `07f9ef64e15c71bf39874bffff26aca5404af9680aa5454a763f4d60113c0bb6`. Its source manifest is `7304b0a8b6a56e04a44f52ab1438a8563c7f8fb6138b7476b21f9966dac011a8`; manifests before and after verification match. Pulling the installed package back from the Pixel produces the same APK digest. Evidence is `.local/atlas-globe-refinement-v3-final-verification.json` and `.local/phone/refined-final-package-proof.json`.

Physical checks on the Pixel confirm the final button is 400 by 44 CSS pixels, the layout has no horizontal overflow, and 32 touch events rotate the zoomed view. A short sample records 120 display frame intervals with an 8.3 ms median and 9.5 ms 95th percentile. The preceding candidate also passed landscape layout and Google chooser cancellation. Those account controls did not change in the final border optimization. These observations do not measure sustained thermals, battery use, or GPU completion time. Stay awake remains 15, and rotation settings were restored to their original values.

The deployed website was exercised in Chrome on the Pixel. Google’s button loads, run creation returns 201, an answer returns 200, and progress reaches 2 / 195. The deployed geography hash matches the checked-in snapshot. Chrome initially blocked the API with `ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS` because Tailscale resolves its hostname to a local address. Atlas's origin had an automatically blocked local-network permission. Enabling that single site permission restored the connection. Evidence is `.local/phone/refined-live-website-proof.json`, `.local/phone/refined-globe-proof.json`, `.local/phone/refined-account-cancel.json`, `.local/account-refined-visual.json`, and the account-layout screenshots in `.local/phone`.

GPT-5.6-sol reviewed both the changes and the later border batching. The empty loading row, stale size documentation, and raised-border horizon finding were fixed. Successful Google account login and Android OAuth registration remain unverified, as before this layout change. Browser mock callbacks and chooser cancellation do not establish successful provider sign-in.

## Accounts, profiles, reports, and language update

The Android OAuth client was registered in the existing Google project. After the user accepted consent, real Google sign-in succeeded on the Pixel, and the server confirmed the session. Later APK updates preserved the same account and Google photo. This supersedes the earlier unverified native-login status above. Successful real web Google login remains unverified.

The latest installed app places sign-in in the top-right header. After connection, the profile picture opens the shared menu for profile editing, sign-out, Help, and bug reporting. Account changes are disabled during an active run. Username and avatar choices are independent of the Google profile; browser tests cover presets, actual client-side photo cropping, persistence, cancellation, and failed-save retry.

Physical checks on the Pixel prove that the photo opens the menu, its four actions are present, the profile dialog opens, its preview is below the heading, and its contents fit without horizontal clipping. The confirmed account hides guest-name entry and the Google button. French profile and menu rendering were checked with a temporary WebView navigator-language override, then restored; operating-system language settings and the saved user profile were not changed. Browser tests separately exercise initial French system-language detection, country prompts, the 195-country Help list, profile labels, report validation, and English fallback for other primary languages.

The physical bug-report test persisted one report and published exactly one [GitHub issue](https://github.com/kmarchais/geography-game/issues/92), closed after verification. Its saved context contains Android, build version, viewport, and no active question. No login token, account photo, email, or machine URL was included. The database retains the report for audit. Test suites use isolated databases and mock the publisher.

The installed APK comes from source commit `5f556c838638a7a3d288a844ad81bc14eae16180`. All 289 input hashes match the cloud source manifest, whose digest is `a04e5e88a1a61dfed035d99db41049885bdec27a5f762dc1f98c1260a9c72bec`. The APK was re-signed locally with the existing development certificate. Its size is 10,972,178 bytes and SHA-256 is `cce47864b4949bd8baaea383295969088c815e1c07414fb4c44de303e218631b`. Pulling the installed package back from the Pixel produces the same hash. This remains a debug APK, not a signed Play Store release.

Evidence: `.local/atlas-final-cloud-source-proof.json`, `.local/phone/atlas-final-package-proof.json`, `.local/phone/atlas-header-account-proof.json`, `.local/phone/atlas-header-menu-proof.json`, `.local/phone/atlas-final-profile-layout.json`, `.local/phone/atlas-final-french-profile-proof.json`, `.local/phone/atlas-final-french-menu-proof.json`, `.local/phone/atlas-final-restored.json`, and `.local/phone/atlas-live-report-proof.json`.

Final hosted browser verification and website deployment are still pending at this checkpoint. Local targeted validation passes type-checking, scoped lint, seven unit checks, and fourteen phone-profile browser cases. The API host and its database remain independent of static website deployment. Safari, iOS, release signing, sustained thermal behavior, battery use, and long route-cycle memory remain unverified.

## Final verified interface release, 26 October 2026

Source `8ed9fa81d45cc44a99431cc3e65236195ad0a3da` passes [workflow 40406810967](https://github.com/kmarchais/geography-game/actions/runs/40406810967): type-checking, scoped ESLint, 628 unit tests, 20 API tests, and 88 browser cases across desktop, phone, and tablet profiles. Twenty-six legacy unit cases and two mouse-wheel cases on touch profiles are intentionally skipped. The production Docker image also passes its three hosting integration cases, API persistence across a container restart, and real phone/desktop UI checks with unavailable Google configuration. No live Railway service was deployed.

The final regression fixes preserve fractional mouse coordinates when Chrome rounds wheel events and wait for Google's asynchronous resize before measuring its button. The unchanged wheel test now selects Andorra correctly after zooming from the whole globe. The earlier Google-error overlay failure was reproduced in the actual production image before being fixed. Its message now stays in document flow and no longer intercepts the country-count button.

GitHub Pages serves the verified interface at the original website address. HTTP checks confirm the source commit in the deployed bundle, both translation catalogs, account-menu and report labels, the French manifest, and exact icon, country geometry, and French-name asset hashes. Mobile MCP screenshots of the actual website confirm the official Google entry is at the top right, beside the menu. An older cached wordmark remained visible in that Chrome visit; the directly fetched icon matches the new source. The browser sign-in chooser was not used, so real web Google authentication remains unverified.

The matching Android APK is installed on the Pixel. Its size is 10,972,178 bytes; its SHA-256 is `71ad08308428aaceecaf0e7511e4bc7560a208e5d8757889b84aae361b77d4cc`. Pulling the installed package back produces the same hash. All 295 cloud input hashes match the source commit; the source-manifest digest is `4c7d41549c86bcb86620f33512a7d93e931761508c4d3d4aff4f4040d27c693f`. The existing signing certificate and Google account are preserved.

Physical checks confirm the profile picture opens the four account/menu actions, the Google photo loads, the guest name and login entry disappear when connected, and the layout fits. An earlier candidate with the same feedback fix also passed the unavailable-Google tooltip test after a CDP offline simulation; its trace records the offline and online commands, followed by successful account restoration. Phone access was stopped when the user requested it and resumed only after explicit authorization. No screen lock was bypassed.

Final evidence uses versioned filenames to avoid overwriting earlier checkpoints: `.local/atlas-8ed9fa8-cloud-source-proof.json`, `.local/atlas-8ed9fa8-ci.log`, `.local/atlas-published-8ed9fa8.json`, `.local/phone/atlas-8ed9fa8-package-proof.json`, `.local/phone/atlas-8ed9fa8-connected.json`, `.local/phone/atlas-8ed9fa8-menu.json`, and `.local/phone/atlas-8ed9fa8-published-web.png`. The feedback interaction evidence is `.local/phone/atlas-feedback-offline-trace.json` and `.local/phone/atlas-feedback-tooltip-proof.json`.

The temporary Pages feature-branch permission was removed after deployment; only `main` and `gh-pages` remain permitted. The live account API, its database, and the Funnel route remain in place. The user requires zero payment. Free Cloudflare hosting is documented as a proposed migration in `docs/free-hosting.md`; account access and adapting the Node/SQLite backend remain required. No subscription, database volume, or existing player data was replaced.
## Cloudflare migration verified, 26 October 2026

Source `252422576409cb1e37078bf75364a26f89a0afc8` passes [workflow 40414124825](https://github.com/kmarchais/geography-game/actions/runs/40414124825): type-checking, scoped ESLint, 628 unit cases, 20 API cases, 88 browser cases, production-image integration, root website checks, Android compilation, and Pages deployment. The isolated local Cloudflare runtime additionally completes a 195-answer integration run, including answer ordering, idempotency, correctness and ranking. Twenty-six legacy units and two wheel cases on touch profiles remain intentionally skipped. The Worker test is skipped in the ordinary Node API invocation and explicitly executed by the hosting job.

The website and API are live at https://atlas-geography.kmarchais-atlas.workers.dev/. The original Pages website and new native bundle point directly to this API. HTTP verification matches nine deployed core assets and entry files against the tested root web artifact. The old API route now proxies to Cloudflare for compatibility; its source database is preserved and no longer receives game writes. No paid subscription was activated. The legacy Railway PostgreSQL volume was not changed.

A SQLite backup and a digest comparison prove that all five tables were imported without changing rows or duplicating an import. The source digest was checked again under a write lock during compatibility cutover. The import handler and its secret were then removed from production. Read-only API checks verify foreign-origin rejection and secure partitioned native challenge cookies. The GitHub secret's owner and recovery of the existing issue were verified without posting a new issue. Its expiry is 24 January 2027.

Real Google sign-in succeeded on the Pixel in the updated native app and in Chrome on the Cloudflare website after its origin was registered. Native session values match the original account's ID, chosen name, picture and avatar. The connected header replaces sign-in with the profile photo and hides the guest-name field. A cold native start restored the same profile. The first post-upgrade network requests failed; a reload recovered them, and the later cold-start check passed. This initial network failure was not reproduced or assigned a cause. No locked screen was bypassed.

The installed APK matches the locally re-signed artifact: 10,972,178 bytes, SHA-256 `fcee693543808ea40aba3f4133cfbeab4753797069478ed49fd2d87d71c6aaa8`. Its 299 build input hashes match the source commit; manifest SHA-256 is `50a79abafea1f87864ca96fa71368f64ea566f360204ba7e0810cd07c66d8aa7`. Inspection confirms the Cloudflare endpoint is embedded and the old machine endpoint is absent. This is still a debug APK, not a Play Store release.

Evidence: `.local/atlas-cloudflare-final-ci.log`, `.local/atlas-2524225-cloud-source-proof.json`, `.local/atlas-published-2524225.json`, `.local/cloudflare-deployment-proof.json`, `.local/cloudflare-remote-import-proof.json`, `.local/cloudflare-cutover-proof.json`, `.local/cloudflare-github-proof.json`, `.local/phone/atlas-cloudflare-connected.json`, `.local/phone/atlas-cloudflare-package-proof.json`, `.local/phone/atlas-cloudflare-connected.png`, and `.local/phone/atlas-cloudflare-web-after-auth.png`.

Only `main` and `gh-pages` remain allowed in the Pages deployment environment after removal of the temporary feature-branch permission. Wrangler and Cloudflare MCP OAuth authentication are configured in the developer environment. See [free hosting operations](free-hosting.md) for quotas and database rollback constraints. Safari, iOS, release signing, sustained thermals, battery use, and long route-cycle memory behavior remain unverified.

A final Node-host regression check found that extracting the shared handler had moved malformed URL parsing outside the old error guard. A raw malformed request reproduced the failure before correction. The Node wrapper now preserves the guard; all 20 API cases pass again, including the malformed-request assertion, and scoped lint passes. This changes only the optional Node host, not the deployed Worker or Android runtime. Evidence: `.local/cloudflare-node-transport-before.log` and `.local/cloudflare-node-transport-after.log`.

The optional Node-host correction also passes production Docker integration and isolated Cloudflare runtime verification in [workflow 40416483887](https://github.com/kmarchais/geography-game/actions/runs/40416483887), source `f0a3004`. No frontend or Worker runtime code changed after the deployed `2524225` release. Temporary local Worker servers, the Mobile MCP bridge and the owned native CDP forward were stopped; the legacy compatibility proxy remains available. Migration credentials were removed locally, and only the GitHub reporting secret remains on the production Worker. Cloudflare `.dev.vars` variants are excluded from Git and Docker contexts.
