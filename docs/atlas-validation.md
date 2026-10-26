# Atlas validation

The Atlas challenge replaces Orbit's expedition settings. Historical Orbit results in `validation.md` do not verify the new mode or ranking service.

## Current verification

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
