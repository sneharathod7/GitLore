# GitLore Backend

Hono + MongoDB API. This tree is merged incrementally: this commit provides `/health`, `/test/*`, and database bootstrap. OAuth, repository, and AI routes land in follow-up PRs.

## Run (this PR)

```bash
cd Backend
npm install
cp .env.example .env
# Set MONGODB_URI at minimum
npm run dev
```

Use `GET /health` and `GET /test/ping` to verify the process.

CORS uses an explicit allowlist (not `*`) so cookies work once OAuth lands. Override with `CORS_ORIGIN` (comma-separated) if the frontend runs on another host or port.

`/test/env-check` is disabled when `NODE_ENV=production`.

See `.env.example` for variables required by later PRs.
