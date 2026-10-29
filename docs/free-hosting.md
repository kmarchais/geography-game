# Free cloud hosting for Atlas

Play Atlas at https://kmarchais.github.io/atlas/. GitHub Pages serves this website. Cloudflare Workers serves `/atlas-api` and an additional website at https://atlas-geography.kmarchais-atlas.workers.dev/. A SQLite-backed Durable Object stores accounts, sessions, scores, profiles, and bug reports. The original GitHub Pages site and Android app call the same cloud API directly. No personal computer needs to stay awake.

The budget is zero. No Workers Paid subscription, Railway subscription, or paid domain was activated. Keep the account on Free.

## Free quotas

| Component | Allowance checked on 26 October 2026 |
| --- | --- |
| Static assets | Free, unlimited static requests |
| Worker API | 100,000 requests per day, 10 ms CPU per invocation |
| Durable Object | 100,000 requests and 13,000 GB-seconds per day |
| SQLite storage | 5 GB total; 5 million rows read and 100,000 rows written per day |

A full three-attempt run uploads between 195 and 585 guesses. Each resolved country also updates global counters and, when signed in, private account counters. Index updates, deletes, and alarm writes also consume the storage allowance. Exceeding Free quotas fails requests; it does not activate paid usage. The existing unranked practice and local personal best behavior remains available when shared services cannot be reached.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), and [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

## Implementation and deployment

### Run metadata

New runs store `runs.client_source` as `desktop-web`, `mobile-web`, or `native-app`. Older clients and historical rows use `unknown`. The native build supplies its app flag; websites classify phones and tablets from browser device information. This is client-reported metadata, not an authenticated device identity. No raw user agent is retained.

`runs.finished_at` records the server's Unix timestamp in milliseconds when it accepts the final answer. Answer retries and later score publication or Google claims preserve it. Private personal score responses include `finishedAt`; the personal ranking displays it in the player's language and local time zone. Offline personal scores use the device clock at completion.

Historical finish dates remain null and display as unavailable. `time_ms` measures the last correct answer on the game clock, which excludes some pauses, so adding it to `started` cannot recover a finish timestamp. The migration preserves existing scores and owners. Take a current authenticated SQL snapshot before deploying this schema change, as described below. The release and physical-device verification are recorded at the end of this document.

Score ownership already distinguishes account types. A `player` beginning with `google:` belongs to a Google account, `guest:` identifies a published guest, and `anonymous:` identifies an unnamed run. Legacy bare UUIDs are guests. A later Google claim changes the score owner without changing its source or finish date. Account type and device source stay in the database; public rankings do not expose them.

The personal ranking lists individual completed runs by weighted points descending, then score time ascending. It displays percentage, points, correct countries, yellow/orange/red counts, skips, finish date and time, and score duration. Correct countries include all three successful attempt colours. Red includes skips; the separate skipped count is a subset, not another category to add to red. The API reconstructs skips from retained resolved answers, including historical runs. New device-local scores store skips directly; missing historical local values remain unavailable.

`GET /scores/me?rules=4&offset=0` returns up to 20 authenticated account runs per page. Load more retrieves later ranks without discarding earlier runs. Guests see the personal scores retained on that device, currently the best 20. The personal table scrolls horizontally within the dialog on narrow screens. Public rankings retain one best published run per account or guest identity and omit private finish dates and skip counts. Names alone never merge different players.

```sql
SELECT name,
  CASE WHEN player LIKE 'google:%' THEN 'google'
       WHEN player LIKE 'anonymous:%' THEN 'anonymous'
       ELSE 'guest' END AS account_type,
  client_source, finished_at
FROM runs WHERE complete = 1;
```

### Answer recordings and opening order

The first ten questions exclude countries marked `small` in the existing geography snapshot. This is the same small-target classification used by the globe, not a familiarity list or a difficulty estimate from the small existing player sample. Both online and offline decks shuffle the eligible opening targets and the remaining questions and include all 195 countries exactly once. Runs record `orderPolicy: no-small-first-10-v1`; explicit server decks and active older runs keep their existing order. Scoring remains rules 4. Small fixture datasets with fewer than ten non-small targets put all eligible targets first.

Each accepted answer retains its selected country and cumulative game time. New recordings add the selected map coordinates, input method, camera distance, canvas dimensions, marker-versus-land selection, and marker/border/result-colour settings. Marker selections retain the actual map point, not the marker country's centre. Skips have null coordinates. Coordinates are map selections, not the player's physical location. Ocean clicks and gestures are not scored guesses and do not enter the answer sequence.

New clients start runs with `ignoreAnswered: true`. Selecting a previously resolved country does nothing, whether its result is green, yellow, orange, or red, including skips. The shared game function returns the unchanged session before feedback, recordings, statistics, or answer uploads. Normal searching time continues; touch-recognition delay follows the existing timing rule. The server independently ignores the same selection without changing stored state or attempts. Runs from older clients retain their original policy so their local attempt counters remain compatible with the server until those clients are updated. The server records this policy per run.

Each guess also stores its server receipt time and `responseMs`, the difference from the preceding accepted guess's game time. This makes first-response time, subsequent hesitation, skip timing, and question position reconstructible without counting reveal pauses as searching. Existing attempts before a skip remain in order. Retries do not add guesses or replace their first recorded context. Previous feedback follows from the attempt number; earlier answer reveals follow from the preceding resolved answers. The current game has no separate hint button.

`priorResolved` counts earlier resolved encounters, with an explicit `account`, `device`, or `unknown` scope. The server uses private account counters for Google players; guests can report device-local counters. This does not count a question merely displayed and then abandoned, or identify one guest across devices. New run metadata includes mode, scoring version, the server and client geography SHA-256 digests, client build, initial authentication type, and ordering policy. Client input and timing metadata are descriptive, not proof against cheating.

Up to 32 network failure records retain only an operation, error category, HTTP status, attempt number, and timestamp. They contain no request body, credential, URL, or email. The client sends these on completion, Stop, and score-save attempts through an owner-authorized recording endpoint. Recording errors do not change the score. A failed recording upload remains in local storage; automatic offline upload is not implemented.

Explicit Stop records a terminal status without publishing a partial score. Incomplete runs older than 24 hours become `inactive` on the next run start, rather than being deleted. `inactiveAt` is the classification time, not evidence of when someone left. Their accepted guesses remain available for abandonment analysis. Inactive and stopped runs do not consume the active-run limit. Server history has no new automatic retention cutoff; monitor storage before introducing a deletion policy.

The device keeps the last ten recordings, including offline attempts and failed requests. Google recordings use separate account-local storage buckets. Tokens remain outside these stored recordings. If storage is blocked or full, gameplay continues. Private answer context is not added to public rankings or global country-statistics responses.


`server/api.mjs` owns the shared authentication, ownership, scoring, and report behavior. `server/ranking.mjs` supplies Node HTTP and local SQLite. `server/cloudflare.mjs` supplies Worker transport, synchronous SQLite queries, transactions, and durable report alarms. One shared ranking object keeps the initial small player pool in a single transactional database. Partition runs or move to D1 if throughput becomes a limit.

Wrangler 4.153.0 is authenticated. Official Cloudflare skills and its MCP server are installed in the developer's Codex configuration, and MCP OAuth authentication is verified. Restart the agent to load newly installed MCP tools. The optional `cf` CLI was not installed.

The primary Pages and Cloudflare root web source is `21ace30cb788714c9af302862a11c6a8cfdd1dbd`; the compatibility Pages site uses `337410d703eb97bcec3b54ce07e59b796fb6c53b`. Application inputs match the physically verified `32f41a2` APK and API; later changes concern tests, workflow, and documentation. [Validation](atlas-validation.md) distinguishes the combined profile coverage, corrected interface runs, and publication checks. The root web artifact is retained as `atlas-cloudflare-web`. Production variables are `GOOGLE_CLIENT_ID`, JSON `ATLAS_ALLOWED_ORIGINS`, and JSON `ATLAS_CROSS_SITE_ORIGINS`. Preserve them when updating from the generic root configuration. The GitHub token is a Worker secret, never a frontend variable.

For a local PowerShell build and update after the required checks:

```powershell
$env:BASE_URL = '/'
$env:VITE_ATLAS_API_URL = '/atlas-api'
$env:VITE_ATLAS_BUILD = (git rev-parse HEAD)
bun run build
npx --yes wrangler@4.153.0 deploy --keep-vars
```

For local Worker integration testing, build the root website, start `npx --yes wrangler@4.153.0 dev --port 8787 --ip 127.0.0.1`, then set `ATLAS_WORKER_TEST_URL=http://127.0.0.1:8787` and run `node --test tests/server/cloudflare-runtime.test.mjs`. The test refuses production hosts. CI also exercises it against an isolated local database.

## Migration and account verification

SQLite's backup API captured the original database. All rows in `atlas_users`, `atlas_sessions`, `atlas_challenges`, `runs`, and `bug_reports` were imported into an empty cloud database. Source and destination JSON digests matched: `a84263b799b06b10f1a5841b7a913328c380819f358fbdc1d0b1af27e48111d6`. At migration there was one account, one session, two challenges, three runs, and one report. A repeated import produced the same digest without duplicates.

The old service was switched to a compatibility proxy while holding a source SQLite write lock and checking the digest again. It no longer writes a separate score database. The original SQLite file and timestamped backups are preserved. These are migration checkpoints, not backups of subsequent cloud writes. Export current cloud data before any future database rollback; do not resume the old writable service against its frozen checkpoint.

The temporary import handler and its authentication secret were removed from production. The normal Worker returns 404 for that import route. Native CORS, Secure/HttpOnly/Partitioned challenge cookies, and foreign-origin rejection were checked on the deployed API.

After the new web origin was authorized in Google Cloud, real Google login succeeded on the Pixel in both the native app and Chrome. Native `/auth/session` matched the original account ID, chosen name, Google picture, and avatar. The photo replaced the sign-in button, the guest-name field disappeared, and a cold app start restored the authenticated profile. The first requests immediately after the APK upgrade failed; one reload restored service. The subsequent cold-start check passed without a reload. The cause of that initial network failure was not established.

The GitHub secret belongs to `kmarchais`. A read-only publisher check recovered the existing report's issue without posting anything. The token expires on **24 January 2027** and must be renewed before then. Reports remain durable and pending if publication fails.

Evidence: `.local/cloudflare-remote-import-proof.json`, `.local/cloudflare-cutover-proof.json`, `.local/cloudflare-public-api-proof.json`, `.local/cloudflare-github-proof.json`, `.local/cloudflare-deployment-proof.json`, `.local/phone/atlas-cloudflare-connected.json`, and `.local/phone/atlas-cloudflare-package-proof.json`.

## Three-attempt update, 27 October 2026

Source `28bebbd158a824bd0baaf7941a0cc36f311bb5f7` is published after [workflow 40538700085](https://github.com/kmarchais/geography-game/actions/runs/40538700085). The migration adds the `published` column and `country_stats` table, preserving existing rows. New three-attempt runs use version 3; legacy runs remain stored and can be queried with `rules=2`. Unnamed runs are private until explicit publication. Global statistics contain only country counters, and private account counters require a session.

A consistent read-only SQL snapshot and verified SQLite archive were retained immediately before deployment. SQLite backup APIs are not exposed by the Durable Object SQL adapter, so this snapshot used the authenticated Cloudflare SQL query API, without a production export endpoint. The post-deployment comparison confirms the existing users, sessions, reports, and three old runs. Two expired Google challenges were replaced by normal challenge renewal. Backups are local, ignored, and contain private data.

Cloudflare version `6681d2ed-05a1-442f-bb45-7728a1ddacb3` and the original Pages website use the verified artifact. Configured Google and CORS variables and the GitHub secret were preserved. The temporary Pages branch policy was removed after publication. Rolling back code does not roll back SQLite; retain current cloud data and leave the original local migration checkpoint frozen.

## Atlas address and minimal results update

The hosting-only [kmarchais/atlas repository](https://github.com/kmarchais/atlas) contains a README and Pages workflow. It checks the source commit against successful build, Android, and hosting jobs in the original repository. It then builds that commit with `/atlas/` as the base, tests the prefixed interface and offline navigation with an isolated API, and publishes from `main`. Generated bundles remain artifacts. [Publication 40557915148](https://github.com/kmarchais/atlas/actions/runs/40557915148) passed for source `28e9033`. Both Pages addresses were checked against the source assets after publication. OAuth origins use the scheme and hostname, so changing the path from `/geography-game/` to `/atlas/` needs no new Google origin.

The matching Cloudflare deployment is version `812b03f2-aad2-46c2-9136-9a34c155b16f`, recorded in `.local/atlas-final-cloudflare-deploy.log`. Its nine checked files match the verified artifact, and `--keep-vars` preserved configuration. `/scores/me` uses the authenticated server account and rejects guests. No database schema changed in this update. A consistent read-only snapshot was still retained before deployment in `.local/atlas-final-predeploy-backup.json`.

An initial physical-test setup created one empty run before network mocking was active. No answers or country counters were submitted. That run was removed by its exact ID and empty state. Starting it also performed the existing 24-hour expiry of three older incomplete runs; no completed score was deleted. The migration checkpoints still retain those historical rows. See `.local/phone/atlas-minimal-empty-run-cleanup.json`.

The temporary feature-branch permission in the original repository's Pages environment was removed after deployment. Only its `main` and `gh-pages` policies remain; the new hosting repository keeps its `main` policy. Rollback still requires preserving current cloud data, and must not restart a writable service from the frozen local migration checkpoint.

The later Play-button correction uses source `d09a86f` and Cloudflare version `2718831c-8397-4580-8d72-9589b79a1e24`. [Atlas publication 40564729835](https://github.com/kmarchais/atlas/actions/runs/40564729835) passed ten prefix and offline tests. It changes the button's CSS and start-layout regression only, with no API or database change. Configuration was preserved with `--keep-vars`; the temporary original-site deployment policy was removed again after publication.

The attempt-colour and contextual-reveal release uses `f3217b7` and Cloudflare version `94d1528b-98ec-40aa-9653-dc21e304b76f`. [Atlas publication 40578143497](https://github.com/kmarchais/atlas/actions/runs/40578143497) passed ten prefix and offline cases. This update changes client rendering and tests, with no API or database schema change. Dynamic paint retains completed polygons and avoids expensive texture filtering; detailed Earth imagery keeps its existing filtering. Variables and secrets remain preserved, and the temporary Pages policy was removed. [Atlas validation](atlas-validation.md) records the failed early runs, corrected tests, native evidence, and exact final verification scope.

## Weighted API and UN map rollout

Source `32f41a2` first updated the API in Worker version `36e61318-84fd-4c3d-9c72-aff1afd9db3b`. The previous root web artifact was retained while browser validation finished, then replaced by the verified `21ace30` artifact. Deployment used `--keep-vars`, and the existing SQLite Durable Object remains the sole writable database on Free. Existing runs, accounts, reports, and found/skipped counters match the consistent pre-deployment archive. New colour counters reconstruct retained three-attempt history once; old rules continue to work. The pre- and post-deployment archive proofs are `.local/un-predeploy-backup-proof.json` and `.local/un-postdeploy-backup-proof.json`, with preservation checks in `.local/un-production-migration-proof.json`.

Rollback must preserve the new tables and `runs.points` column and must not restart a writable legacy checkpoint. Rolling back code does not restore data. The rejected grey-territory revision was never published; its cancelled workflow's temporary Pages policy was removed. Final static publication is complete. Worker version `3f265897-09aa-4c2c-84e1-b33d14bca464` serves the verified root artifact; ten served files match it. Atlas publication 40600919687 passed ten prefix/offline cases, and workflow 40600928355 deployed the compatibility site after 45 clean interface cases. Both Pages source IDs and country-data hashes were checked. The temporary feature-branch environment permission is removed.

Static rollback can retain the current API. APIs older than this release reject rules-4 runs, so retain rules-4 API support while current native and web clients are in use.

## Hover rendering update, 28 October 2026

Source `09632c0` serves all three web addresses after verification run 40604979250 and Atlas publication 40606087810. Cloudflare version `a676909f-82e0-47e6-be9a-e5d06ef6e3f6` uses the verified root artifact with `--keep-vars`. This update changes client hover rendering only; API code, database schema, geography, and configured bindings are unchanged. The first Atlas publishing attempt received HTTP 403 while checking GitHub verification metadata; its retry passed ten prefix/offline tests. Served assets and build IDs match the source, and the temporary Pages feature-branch permission is removed. The phone's installed APK remains unchanged. See the hover section in [Atlas validation](atlas-validation.md) for checks and artifact hashes.

## Play, Stop, and reveal update, 28 October 2026

Source `6e15e13` now serves all three websites after verification 40662876245 and Atlas publication 40664132031. Cloudflare version `c6256adc-f6ab-4e2b-8722-2d0399af700d` serves the verified root artifact with `--keep-vars`. This release changes client interactions and translations only. API code, database schema, country boundaries, and configured bindings are unchanged. All served build IDs and geography hashes match; ten Cloudflare files match the artifact. Production interaction checks passed 68 cases with four mobile mouse-only skips. Atlas prefix/offline checks finished with nine clean passes and one startup retry, recorded in [Atlas validation](atlas-validation.md). The temporary Pages feature-branch permission is removed. No production test scores were created, and the phone's installed app remains unchanged.

## Hover damping and one-handed zoom update, 28 October 2026

Source `d311cbf` serves all three websites after verification 40703496332 and Atlas publication 40705287073. Cloudflare version `dff6db23-8133-4d9d-9b8d-e60fb7bccbe0` uses the verified root artifact with `--keep-vars`. API code, database schema, country boundaries, configured bindings, and Google/CORS settings are unchanged. Production input checks passed 34 cases with 11 capability-specific skips; all ten Atlas prefix/offline cases passed without retries. Served files and build IDs match the artifacts, and the temporary Pages feature-branch permission is removed.

The Pixel was updated with signed runtime source `6dbf60d` and tested using native touch events. Published `d311cbf` differs only in a browser fixture and the decision trail. Physical zoom, ordinary answering, and Stop passed without creating production test runs. Storage and the confirmed profile were preserved, and test hooks were removed. [Atlas validation](atlas-validation.md) records the failed initial CI, corrected fixture, source manifests, installed APK hash, physical evidence, and verification limits. Static rollback can continue using the unchanged API and current database.

## Run history and recording release, 29 October 2026

Source `1b17f2cdaa94b26b5bdba7c6cc0fa47b5c00a9b5` serves all three websites after [verification 40894570371](https://github.com/kmarchais/geography-game/actions/runs/40894570371) and [Atlas publication 40897499829](https://github.com/kmarchais/atlas/actions/runs/40897499829). Desktop, phone, tablet, build, hosting, Android, and both Pages deployments passed. CI recorded 663 unit passes with 26 legacy skips, 34 Node API passes, and a separate isolated Cloudflare runtime pass. All ten Atlas prefix/offline checks passed. The superseded verification caught the recording module missing from the Node image; the Dockerfile now copies it, and the corrected production-image checks passed.

In the full browser matrix, 137 tests passed immediately and two tablet tests passed on retry; 11 cases were skipped for platform capabilities. The retried cases concerned the profile picture and cancelling a reveal. Both initially exceeded a five-second element/attribute expectation. Their retries passed, as did the new ranking and answered-country cases. The workflow retains the initial failure traces; these results do not establish that the two tests are deterministic.

The API deployed first with the existing verified website assets in Worker version `3b07c1db-4f4b-4998-a832-5541bc1d0f21`. Final Worker version `cd958fc1-9005-484d-b817-470e5537031a` serves the verified root web artifact. Both updates used `--keep-vars`. Google/CORS settings, the GitHub secret binding, and the existing SQLite Durable Object binding were preserved. A consistent pre-deployment SQL archive was verified before the schema change and retained on both computers. The post-deployment archive matches every original field of all 11 runs and all rows in the seven other tables. Historical finish dates and device sources remain unknown. Twelve served Cloudflare files match the artifact; all websites report the release build and retain the same country-data hash.

The Pixel 10 Pro XL runs the matching APK, signed with its existing certificate. Installed bytes match the signed artifact, SHA-256 `35844f27588ba4bc8d42a1a9b37997b266b44fe040ac899f154da7186cf5b7b1`. The actual native WebView loaded the release assets and restored its confirmed Google session and original local storage. Its personal ranking displayed both account runs with counts matching the authenticated API, and horizontal table scrolling stayed inside the dialog. Native touch completed a country once and ignored a later selection of that answered country. The run request reported the native source and new answer policy; Stop was recorded. These gameplay checks blocked production mutations. Local test data was restored and temporary hooks were removed. This verifies session restoration, not a fresh Google chooser login.

The original Pages feature-branch publishing permission was removed; only its `main` and `gh-pages` policies remain. No paid service was activated. Keep the current API when rolling static assets back: updated clients send recording metadata and the per-run answer policy that older APIs do not accept. A code rollback does not restore SQLite. Preserve current cloud data and keep the original local migration checkpoint frozen.

Evidence is retained in ignored `.local/analytics-release-predeploy-proof.json`, `.local/analytics-release-migration-proof.json`, `.local/analytics-release-api-proof.json`, `.local/analytics-release-web-proof.json`, `.local/analytics-release-public-proof.json`, `.local/analytics-release-native-install-proof.json`, and `.local/analytics-release-native-ui-proof.json`. The source and Atlas workflow logs record full verification and publication results.
