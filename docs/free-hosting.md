# Free cloud hosting for Atlas

Atlas is deployed at https://atlas-geography.kmarchais-atlas.workers.dev/. Workers serves the static website and `/atlas-api`; a SQLite-backed Durable Object stores accounts, sessions, scores, profiles, and bug reports. The original GitHub Pages site and the updated Android app call the same cloud API directly. Neither requires a personal computer to stay awake.

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

The production website was built and tested in [workflow 40414124825](https://github.com/kmarchais/geography-game/actions/runs/40414124825), from source `252422576409cb1e37078bf75364a26f89a0afc8`. The root web artifact is retained as `atlas-cloudflare-web`. Production variables are `GOOGLE_CLIENT_ID`, JSON `ATLAS_ALLOWED_ORIGINS`, and JSON `ATLAS_CROSS_SITE_ORIGINS`. Preserve them when updating from the generic root configuration. The GitHub token is a Worker secret, never a frontend variable.

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
