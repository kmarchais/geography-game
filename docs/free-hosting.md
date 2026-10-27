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

`server/api.mjs` owns the shared authentication, ownership, scoring, and report behavior. `server/ranking.mjs` supplies Node HTTP and local SQLite. `server/cloudflare.mjs` supplies Worker transport, synchronous SQLite queries, transactions, and durable report alarms. One shared ranking object keeps the initial small player pool in a single transactional database. Partition runs or move to D1 if throughput becomes a limit.

Wrangler 4.153.0 is authenticated. Official Cloudflare skills and its MCP server are installed in the developer's Codex configuration, and MCP OAuth authentication is verified. Restart the agent to load newly installed MCP tools. The optional `cf` CLI was not installed.

The current production source is `d09a86f919fd93c06775b33b521f716c9631b07f`, verified in [workflow 40563742671](https://github.com/kmarchais/geography-game/actions/runs/40563742671). The root web artifact is retained as `atlas-cloudflare-web`. Production variables are `GOOGLE_CLIENT_ID`, JSON `ATLAS_ALLOWED_ORIGINS`, and JSON `ATLAS_CROSS_SITE_ORIGINS`. Preserve them when updating from the generic root configuration. The GitHub token is a Worker secret, never a frontend variable.

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
