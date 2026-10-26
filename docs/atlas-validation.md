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

Real Google sign-in is pending Google Cloud configuration. The real web SDK rejects the new website origin; native account registration and authenticated-session restoration have not been proven. The current shared-ranking database is reused; the original Railway database was not accessed or migrated. Guest play remains available.
