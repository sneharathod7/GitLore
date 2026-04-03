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

See `.env.example` for variables required by later PRs.
