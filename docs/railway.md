# Host Atlas on Railway

One Node service can serve the website and `/atlas-api` on the same HTTPS origin. The checked-in Dockerfile builds the shared Vue interface at `/`, installs production dependencies, and starts the existing account and ranking API. Railway supplies `PORT`; Node binds to `0.0.0.0`. `/atlas-api/health` is the deployment health check.

Set the target service's builder to Dockerfile, start command to `node server/ranking.mjs`, health-check path to `/atlas-api/health`, and replica count to one. Clear legacy Nixpacks and Python start-command overrides on that service only. Configuration is recorded here instead of adding a deprecated `railway.toml`; do not import or apply whole-project infrastructure definitions that could delete the legacy PostgreSQL service.

## Persistent data

Attach a persistent volume at `/data`. The database is `/data/atlas.sqlite`. Railway startup refuses to run without a volume, rather than silently creating an ephemeral database. Keep one replica with SQLite. The existing PostgreSQL service is a separate legacy database; this configuration neither deletes nor migrates it.

Before migration, use SQLite's backup API to snapshot the running Atlas database. Preserve the original database and the PostgreSQL volume. Stop writes during the final transfer and verify account, run, report, and ownership counts before changing the production API URL. Import only into the intended Atlas database, with the service stopped. Keep a rollback copy. Do not upload a live SQLite file without its transaction state or overwrite a database held open by the server.

## Runtime settings

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | Existing Google OAuth web client ID. No client secret is required. |
| `ATLAS_DB` | `/data/atlas.sqlite`, set by the image. |
| `ATLAS_STATIC_DIR` | `/app/dist`, set by the image. |
| `ATLAS_ALLOWED_ORIGINS` | Exact website origins and `https://localhost` for Android. If unset, the service includes Railway's generated public origin automatically. |
| `ATLAS_CROSS_SITE_ORIGINS` | `https://localhost`, plus the old Pages origin while retaining that website. The Railway website itself uses same-origin cookies. |
| `ATLAS_GITHUB_TOKEN` | Optional Railway secret for automatic GitHub issues. Use a fine-grained token owned by `kmarchais`, limited to this repository with Issues read/write permission. Without it, the local publisher expects an authenticated GitHub CLI. Reports remain saved while publication is unavailable. |

Keep secrets in Railway variables. Never put the database, credentials, or `.local` configuration in the Docker build context. The `.dockerignore` excludes them.

The frontend calls relative `/atlas-api` routes. No Tailscale connection or local-network permission is needed for a publicly resolved Railway website and API. Add the exact Railway website origin to the existing Google web client's Authorized JavaScript origins before testing real web sign-in. Android continues to use its existing OAuth package and signing certificate; rebuild it with the new absolute HTTPS API URL only after migration succeeds.

## Validate before cutover

Run the server integration tests, build the image, attach the volume, and check the website, assets, health endpoint, account cookies, and score persistence across a service restart. Verify a real Google web login after adding its origin. Check the final Android API endpoint when phone testing is authorized again. Keep the current API and database intact until the replacement is verified.

Check the workspace plan and spending limits before starting the service. Free credits do not guarantee continuous free hosting. Do not activate a paid subscription or replace the legacy PostgreSQL volume without explicit approval.
