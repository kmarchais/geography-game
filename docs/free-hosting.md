# Free cloud hosting for Atlas

The budget is zero. Do not activate Railway Hobby, Cloudflare Workers Paid, or another paid subscription. The current website is on GitHub Pages and the account API still runs on the existing computer. No cloud database migration has happened.

Cloudflare Workers with static assets and D1 is a candidate for hosting the complete game without keeping a computer awake. A free `workers.dev` address avoids buying a domain. The Vue interface and Android game can stay shared.

| Component | Free allowance checked on 26 October 2026 |
| --- | --- |
| Static website assets | Free, unlimited static requests |
| Worker API | 100,000 requests per day, 10 ms CPU per invocation |
| D1 database | 5 GB total storage, 5 million rows read and 100,000 rows written per day |

These are quotas, not a promise of unlimited traffic or paid-service availability. A full Atlas run uploads 195 answers, and database indexes also contribute to D1's row-write accounting. Keep the account on Free and handle exhausted API quotas as unavailable shared services; local practice should remain playable.

Sources: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [static asset billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/), and [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/).

## Work required before migration

The current Node HTTP server and synchronous `node:sqlite` database cannot be deployed unchanged as a Worker. Adapt the API transport and persistence to Workers and D1, preserving nonce consumption, session verification, answer ordering, idempotency, score ownership, profile updates, and durable bug reports. Keep shared business rules and tests instead of duplicating authentication logic. Verify conditional writes and transactions under concurrent requests.

Export the existing SQLite database through its backup API. Test importing accounts, scores, reports, private claim hashes, and profile choices into an isolated D1 database. Verify counts and ownership before cutover; do not delete the original database or the legacy PostgreSQL volume. Move the browser and Android API endpoints only after the replacement is verified.

Add the final website origin to the existing Google OAuth web client. The Android package and signing certificate stay unchanged. A repository-limited GitHub secret belongs only in the Worker environment, never in the frontend. Keep the existing API available until migrated clients and real Google sign-in are verified.

A Cloudflare account and authenticated deployment access are still required. This document records the proposed free deployment, not an implemented or published Worker.
