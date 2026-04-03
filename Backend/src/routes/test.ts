import { Hono } from "hono";

export const testRouter = new Hono();

/**
 * GET /test/ping
 * Simple ping endpoint to verify server is running
 */
testRouter.get("/ping", (c) => {
  return c.json({ message: "pong", timestamp: new Date().toISOString() });
});

/**
 * GET /test/dummy-explain
 * Returns dummy explanation without calling Gemini
 */
testRouter.get("/dummy-explain", (c) => {
  return c.json({
    pattern_name: "React useEffect Missing Cleanup",
    whats_wrong:
      "Your async fetch inside useEffect has no cleanup function. If component unmounts before fetch completes, setData runs on unmounted component.",
    why_it_matters:
      "React will throw a warning in development, and in production this causes a memory leak.",
    fix: "useEffect(() => {\n  let active = true;\n  fetch(...).then(data => {\n    if (active) setData(data);\n  });\n  return () => { active = false; };\n}, []);",
    principle: "React async effect cleanup pattern",
    confidence: "high",
    confidence_reason: "Dummy test data",
    source: {
      comment_by: "test-user",
      comment_url: "https://github.com/test/test/pull/1",
      pattern_matched: "memory-leak-react-useeffect",
    },
    docs_links: ["https://react.dev/learn/synchronizing-with-effects"],
  });
});

/**
 * GET /test/dummy-analyze
 * Returns dummy narrative without calling GitHub API
 */
testRouter.get("/dummy-analyze", (c) => {
  return c.json({
    one_liner:
      "Rate limiting added after DDoS incident; team chose in-memory over Redis",
    context:
      "In March 2022, production API was hit by DDoS causing 503 errors.",
    debate:
      "PR #847 had debate: Teammate A proposed Redis, Teammate B said DevOps couldn't provision by Friday.",
    debate_quotes: [
      {
        author: "teammate-a",
        text: "Why not Redis? We need distributed support for multi-region deploy.",
        url: "https://github.com/test/test/pull/847#discussion_r001",
        source_type: "pr_review" as const,
      },
      {
        author: "teammate-b",
        text: "DevOps can't provision a new Redis instance by Friday.",
        url: "https://github.com/test/test/pull/847#discussion_r002",
        source_type: "pr_comment" as const,
      },
    ],
    decision:
      "Team chose in-memory token bucket with 48-hour TTL. Tech debt note added.",
    impact: "503 error rate dropped from 12% to 0.1% within 24 hours.",
    confidence: "high",
    confidence_reason: "Dummy test data",
    sources: {
      pr_url: "https://github.com/test/test/pull/847",
      issue_urls: ["https://github.com/test/test/issues/820"],
      review_comment_count: 3,
      data_signals: [
        "git_blame",
        "pull_request",
        "review_comments",
        "linked_issues",
      ],
    },
    timeline: [
      {
        type: "issue",
        number: 820,
        title: "503 errors during peak",
        date: "2022-03-10",
        url: "https://github.com/test/test/issues/820",
      },
      {
        type: "pr",
        number: 847,
        title: "Add rate limiting middleware",
        date: "2022-03-12",
        url: "https://github.com/test/test/pull/847",
      },
      {
        type: "merged",
        date: "2022-03-15",
        url: "https://github.com/test/test/pull/847",
      },
    ],
  });
});

/**
 * GET /test/dummy-guardrails
 * Returns dummy guardrails response
 */
testRouter.get("/dummy-guardrails", (c) => {
  const ALLOWED = [
    "analyze_public_repo",
    "generate_narrative",
    "explain_review_comment",
    "search_similar_decisions",
    "generate_voice_narration",
  ];

  const BLOCKED = [
    "access_private_repo_without_auth",
    "modify_code",
    "post_comments_on_behalf_of_user",
  ];

  return c.json({
    status: "guardrails_active",
    allowed: ALLOWED,
    blocked: BLOCKED,
    test_mode: true,
  });
});

/**
 * GET /test/env-check
 * Development only — avoids disclosing which secrets exist in production.
 */
testRouter.get("/env-check", (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ error: "Not found" }, 404);
  }
  return c.json({
    env_loaded: {
      MONGODB_URI: process.env.MONGODB_URI ? "✅ Set" : "❌ Not set",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY ? "✅ Set" : "❌ Not set",
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? "✅ Set" : "❌ Not set",
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET
        ? "✅ Set"
        : "❌ Not set",
      SESSION_SECRET: process.env.SESSION_SECRET ? "✅ Set" : "❌ Not set",
      PORT: process.env.PORT || "3001",
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  });
});
