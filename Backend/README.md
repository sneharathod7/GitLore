# GitLore Backend

Hono + MongoDB API, merged in small PRs. This commit adds GitHub OAuth (`/auth/*`) on top of `/health` and `/test/*`.

## Run (this PR)

```bash
cd Backend
npm install
cp .env.example .env
```

Set at least `MONGODB_URI`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`, and `SESSION_SECRET` to exercise OAuth. See `.env.example`.

Repository and AI routes ship in later PRs.
