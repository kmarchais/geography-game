# Free cloud hosting for Atlas

The budget is zero. Do not activate Railway Hobby, Cloudflare Workers Paid, or another paid subscription. The current website is on GitHub Pages and the account API still runs on the existing computer. No cloud database migration has happened.

Cloudflare Workers with static assets and SQLite-backed Durable Objects is the selected candidate for hosting the complete game without keeping a computer awake. A free `workers.dev` address avoids buying a domain. The Vue interface and Android game can stay shared.

| Component | Free allowance checked on 26 October 2026 |
| --- | --- |
| Static website assets | Free, unlimited static requests |
| Worker API | 100,000 requests per day, 10 ms CPU per invocation |
| Durable Object SQLite database | 5 GB total storage, 5 million rows read and 100,000 rows written per day |

These are quotas, not a promise of unlimited traffic or paid-service availability. A full Atlas run uploads 195 answers, and database indexes also contribute to row-write accounting. Keep the account on Free and handle exhausted API quotas as unavailable shared services; local practice should remain playable.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), and [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

## Work required before migration

The current Node HTTP server and synchronous `node:sqlite` database cannot be deployed unchanged as a Worker. The initial adapter in `server/cloudflare.mjs` reuses `server/api.mjs`, preserving nonce consumption, session verification, answer ordering, idempotency, score ownership, profile updates, and durable bug reports. Keep shared business rules and tests instead of duplicating authentication logic. Verify conditional writes and transactions under concurrent requests.

Export the existing SQLite database through its backup API. Test importing accounts, scores, reports, private claim hashes, and profile choices into an isolated Cloudflare database. Verify counts and ownership before cutover; do not delete the original database or the legacy PostgreSQL volume. Move the browser and Android API endpoints only after the replacement is verified.

Add the final website origin to the existing Google OAuth web client. The Android package and signing certificate stay unchanged. A repository-limited GitHub secret belongs only in the Worker environment, never in the frontend. Keep the existing API available until migrated clients and real Google sign-in are verified.

## Current preparation

Wrangler 4.153.0 is authenticated through device authorization. Cloudflare skills are installed in the developer's Codex configuration, and its MCP server is registered. MCP OAuth authorization remains pending after rejected browser links; it is separate from working Wrangler authorization.

The Node host still passes all 20 API tests. The local Cloudflare runtime completed an isolated 195-answer integration test covering correctness, ordering, idempotent retries, ranking, origin rejection, and an unauthenticated profile transaction. No production database has been migrated and no Cloudflare Worker has been published yet. Keep the existing API running.

Use `npx --yes wrangler@4.153.0 dev --port 8787 --ip 127.0.0.1`, then `ATLAS_WORKER_TEST_URL=http://127.0.0.1:8787 node --test tests/server/cloudflare-runtime.test.mjs` on a shell that supports inline environment variables. The test refuses production hosts. Deployment variables include `GOOGLE_CLIENT_ID`, JSON `ATLAS_ALLOWED_ORIGINS`, JSON `ATLAS_CROSS_SITE_ORIGINS`, and the backend-only `ATLAS_GITHUB_TOKEN` secret. A missing publisher token leaves reports pending for retry.

The initial shared ranking uses one Durable Object to retain synchronous SQLite ownership and transaction guarantees. This suits the small initial player pool; partition runs or use D1 if throughput becomes a limit. Durable Objects also have a free 100,000 requests and 13,000 GB-seconds per day allowance, in addition to storage quotas. Exceeding Free quotas fails requests rather than enabling paid usage.
