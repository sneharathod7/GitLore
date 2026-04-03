# GitLore Backend

Hono + MongoDB API, merged in small PRs. This commit adds protected repository REST helpers (`/api/repo/*`, `/api/repos/*`), guardrails, and narrate (placeholder).

Earlier PRs in this stack: foundation (`/health`, `/test/*`) and GitHub OAuth (`/auth/*`). Next PR adds analyze, explain, and search (Gemini).

## Run

```bash
cd Backend
npm install
cp .env.example .env
```

Set at least `MONGODB_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, and `SESSION_SECRET` to exercise OAuth. See `.env.example`.

CORS uses an explicit allowlist (not `*`) so cookies work once OAuth lands. Override with `CORS_ORIGIN` (comma-separated) if the frontend runs on another host or port.

`/test/env-check` is disabled when `NODE_ENV=production`.

See `.env.example` for variables required by later PRs.
