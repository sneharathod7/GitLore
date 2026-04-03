# GitLore Backend

Hono + MongoDB API, merged in small PRs. This commit adds GitHub OAuth (`/auth/*`) on top of `/health` and `/test/*`.

## Run (this PR)

```bash
cd Backend
npm install
cp .env.example .env
```

Set at least `MONGODB_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, and `SESSION_SECRET` to exercise OAuth. See `.env.example`.

CORS uses an explicit allowlist (not `*`) so cookies work once OAuth lands. Override with `CORS_ORIGIN` (comma-separated) if the frontend runs on another host or port.

`/test/env-check` is disabled when `NODE_ENV=production`.

See `.env.example` for variables required by later PRs.
