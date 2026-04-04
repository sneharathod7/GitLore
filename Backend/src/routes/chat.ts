import { Hono } from "hono";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDB } from "../lib/mongo";
import { getCurrentUser } from "../middleware/auth";
import {
  getEmbedding,
  GEMINI_GENERATION_MODEL,
  isGeminiApiKeyError,
  isGeminiRateLimitError,
  withGemini429Retry,
} from "../lib/gemini";
import { cosineSimilarity } from "../lib/vectorUtils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/** Model for knowledge-graph Q&A (override via GEMINI_CHAT_MODEL; else GEMINI_GENERATION_MODEL / default). */
const GEMINI_CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL?.trim() || GEMINI_GENERATION_MODEL;

function parseCommaModels(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
}

/** Tried in order after the primary chat model when that model returns 429 (separate free-tier quotas). */
const DEFAULT_CHAT_MODEL_FALLBACKS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export const chatRouter = new Hono();

export type ChatSynthesis = "none" | "gemini" | "fallback_no_key" | "fallback_error";

chatRouter.get("/repo/:owner/:name/chat/status", async (c) => {
  try {
    const user = getCurrentUser(c);
    if (!user) return c.json({ error: "Not authenticated" }, 401);
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());
    return c.json({
      geminiConfigured,
      model: GEMINI_CHAT_MODEL,
    });
  } catch (error) {
    console.error("Chat status error:", error);
    return c.json({ error: "Failed to read chat status" }, 500);
  }
});

const chatRequestSchema = z.object({
  question: z.string().min(5).max(2000),
});

const STOP = new Set([
  "the",
  "what",
  "why",
  "how",
  "did",
  "does",
  "was",
  "were",
  "this",
  "that",
  "from",
  "with",
  "and",
  "for",
  "are",
  "you",
  "your",
]);

function normalizeRepo(owner: string, name: string) {
  return `${owner}/${name}`.toLowerCase().replace(/^\/+|\/+$/g, "");
}

type Tier = "vector" | "text" | "regex" | "none";

type ScoredNode = { doc: Record<string, unknown>; score: number };

function dedupeByPr(nodes: ScoredNode[]): ScoredNode[] {
  const best = new Map<number, ScoredNode>();
  for (const n of nodes) {
    const pr = n.doc.pr_number as number;
    const cur = best.get(pr);
    if (!cur || n.score > cur.score) best.set(pr, n);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}

const QUOTE_MAX = 450;

function truncQuote(s: string, max: number): string {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function buildContextBlock(n: Record<string, unknown>): string {
  const quotes = (n.key_quotes as Array<{ author: string; text: string }>) || [];
  const alts = (n.alternatives as string[]) || [];
  const files = (n.changed_files as string[]) || [];
  const linked =
    (n.linked_issues as Array<{ number: number; title?: string; url?: string }>) || [];
  const linkedLines =
    linked.length > 0
      ? linked.map((i) => `  - Issue #${i.number}: ${i.title || ""} → ${i.url || ""}`).join("\n")
      : "  (none in index — re-run Build Knowledge Graph to refresh issue links)";
  const mc = n.merge_commit as { short?: string; url?: string } | null | undefined;
  const mergeLine = mc?.url
    ? `Merge commit: ${mc.short || ""} → ${mc.url}`
    : "(merge commit not stored for this PR — re-run ingest to link commits)";
  const narrative = String(n.full_narrative || "").slice(0, 3200);
  const topics = (n.topics as string[]) || [];
  const topicLine = topics.length ? topics.join(", ") : "(none)";
  const prUrl = String(n.pr_url || "");
  const quoteBlock =
    quotes.length > 0
      ? quotes
          .map((q) => `  - ${q.author || "unknown"}: "${truncQuote(q.text, QUOTE_MAX)}"`)
          .join("\n")
      : "  (none)";
  return `--- Knowledge Node (PR #${n.pr_number}, type: ${n.type}) ---
PR URL: ${prUrl || "(unknown)"}
Title: ${n.title}
GitHub author (merge): ${n.pr_author || "unknown"}
Topics: ${topicLine}
Summary: ${n.summary}
Problem: ${n.problem}
Decision: ${n.decision}
Linked issues (from GitHub GraphQL):
${linkedLines}
${mergeLine}
Alternatives considered: ${alts.length ? alts.join("; ") : "(none)"}
Key quotes (exact text from reviews/discussion — use verbatim when citing):
${quoteBlock}
Impact: ${n.impact}
Files changed: ${files.join(", ") || "unknown"}
Merged at: ${n.merged_at || "unknown"}
Consolidated narrative (excerpt): ${narrative || "(none)"}
---`;
}

async function tryVectorSearchAtlas(
  db: ReturnType<typeof getDB>,
  repoFull: string,
  queryVector: number[]
): Promise<ScoredNode[]> {
  const coll = db.collection("knowledge_nodes");
  const pipeline = [
    {
      $vectorSearch: {
        index: "knowledge_vector_index",
        path: "embedding",
        queryVector,
        numCandidates: 100,
        limit: 16,
        filter: { repo: repoFull },
      },
    },
    {
      $set: { vectorScore: { $meta: "vectorSearchScore" } },
    },
    {
      $project: {
        embedding: 0,
        vectorScore: 1,
        repo: 1,
        pr_number: 1,
        pr_url: 1,
        type: 1,
        title: 1,
        summary: 1,
        problem: 1,
        decision: 1,
        alternatives: 1,
        key_quotes: 1,
        impact: 1,
        changed_files: 1,
        merged_at: 1,
        topics: 1,
        full_narrative: 1,
        linked_issues: 1,
        merge_commit: 1,
        pr_author: 1,
      },
    },
  ];
  const raw = await coll.aggregate(pipeline as any).toArray();
  return raw
    .map((doc: any) => ({
      doc,
      score: typeof doc.vectorScore === "number" ? doc.vectorScore : 0,
    }))
    .filter((x) => x.score >= 0.45)
    .map(({ doc, score }) => {
      const { vectorScore: _v, ...rest } = doc;
      return { doc: rest, score };
    });
}

async function tryInMemoryVector(
  db: ReturnType<typeof getDB>,
  repoFull: string,
  queryVector: number[]
): Promise<ScoredNode[]> {
  const docs = await db
    .collection("knowledge_nodes")
    .find({ repo: repoFull })
    .project({
      embedding: 1,
      repo: 1,
      pr_number: 1,
      pr_url: 1,
      type: 1,
      title: 1,
      summary: 1,
      problem: 1,
      decision: 1,
      alternatives: 1,
      key_quotes: 1,
      impact: 1,
      changed_files: 1,
      merged_at: 1,
      topics: 1,
      full_narrative: 1,
      linked_issues: 1,
      merge_commit: 1,
      pr_author: 1,
    })
    .limit(150)
    .toArray();

  const scored: ScoredNode[] = [];
  for (const doc of docs) {
    const emb = doc.embedding as number[] | undefined;
    if (!Array.isArray(emb) || emb.length !== queryVector.length) continue;
    const score = cosineSimilarity(queryVector, emb);
    if (score >= 0.45) {
      const { embedding: _e, ...rest } = doc;
      scored.push({ doc: rest as Record<string, unknown>, score });
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, 16);
}

async function tryTextSearch(
  db: ReturnType<typeof getDB>,
  repoFull: string,
  question: string
): Promise<ScoredNode[]> {
  try {
    const arr = await db
      .collection("knowledge_nodes")
      .find({ repo: repoFull, $text: { $search: question } })
      .project({ score: { $meta: "textScore" }, embedding: 0 })
      .sort({ score: { $meta: "textScore" } })
      .limit(14)
      .toArray();
    return arr
      .map((doc: any) => {
        const { score, ...rest } = doc;
        return {
          doc: rest as Record<string, unknown>,
          score: typeof score === "number" ? score : 0,
        };
      })
      .filter((x) => x.score >= 1.0);
  } catch {
    return [];
  }
}

function keywordsFromQuestion(q: string): string[] {
  const handles = [...q.matchAll(/@([\w-]{2,39})/g)].map((m) => m[1].toLowerCase());
  const words = q
    .split(/\s+/)
    .map((w) => w.replace(/[^\w-]/g, "").toLowerCase())
    .filter((w) => w.length >= 3 && !STOP.has(w));
  const merged = [...handles, ...words];
  return [...new Set(merged)].slice(0, 12);
}

async function tryRegexFallback(
  db: ReturnType<typeof getDB>,
  repoFull: string,
  question: string
): Promise<ScoredNode[]> {
  const keywords = keywordsFromQuestion(question);
  if (!keywords.length) return [];

  const docs = await db
    .collection("knowledge_nodes")
    .find({ repo: repoFull })
    .project({ embedding: 0 })
    .limit(400)
    .toArray();

  const scored: ScoredNode[] = [];
  const fields = [
    "title",
    "summary",
    "decision",
    "problem",
    "full_narrative",
    "pr_author",
    "impact",
  ] as const;

  const linkedText = (doc: Record<string, unknown>) => {
    const arr = (doc.linked_issues as Array<{ title?: string; number?: number }>) || [];
    return arr.map((i) => `${i.number} ${i.title || ""}`).join(" ");
  };

  const quotesText = (doc: Record<string, unknown>) => {
    const arr = (doc.key_quotes as Array<{ author?: string; text?: string }>) || [];
    return arr.map((q) => `${q.author || ""} ${q.text || ""}`).join(" ");
  };

  const topicsText = (doc: Record<string, unknown>) =>
    ((doc.topics as string[]) || []).join(" ");
  const filesText = (doc: Record<string, unknown>) =>
    ((doc.changed_files as string[]) || []).join(" ");
  const altsText = (doc: Record<string, unknown>) =>
    ((doc.alternatives as string[]) || []).join(" ");

  for (const doc of docs) {
    let matches = 0;
    for (const kw of keywords) {
      const re = new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const d = doc as Record<string, unknown>;
      if (
        fields.some((f) => re.test(String(d[f] || ""))) ||
        re.test(linkedText(d)) ||
        re.test(quotesText(d)) ||
        re.test(topicsText(d)) ||
        re.test(filesText(d)) ||
        re.test(altsText(d))
      ) {
        matches++;
      }
    }
    if (matches > 0) {
      const score = matches / keywords.length;
      scored.push({ doc: doc as Record<string, unknown>, score });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, 14);
}

chatRouter.post("/repo/:owner/:name/chat", async (c) => {
  try {
    const user = getCurrentUser(c);
    if (!user) return c.json({ error: "Not authenticated" }, 401);

    const owner = c.req.param("owner");
    const name = c.req.param("name");
    const repoFull = normalizeRepo(owner, name);

    const body = await c.req.json();
    const { question: rawQ } = chatRequestSchema.parse(body);
    const question = rawQ.trim();

    const db = getDB();

    const nodeCount = await db.collection("knowledge_nodes").countDocuments({ repo: repoFull });
    const geminiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());

    if (nodeCount === 0) {
      return c.json({
        answer:
          "No knowledge graph exists for this repo yet. Use **Build Knowledge Graph** on the Overview page to ingest merged PRs, then ask again.",
        sources: [],
        searchTier: "none" as Tier,
        nodesSearched: 0,
        nodesUsed: 0,
        geminiConfigured,
        synthesis: "none" as ChatSynthesis,
        model: GEMINI_CHAT_MODEL,
      });
    }

    const progress = await db.collection("knowledge_progress").findOne({ repo: repoFull });
    const ingestNote =
      progress && (progress as any).status === "running"
        ? "\n\n_Note: Knowledge graph ingestion is still running — some PRs may not be indexed yet._\n"
        : "";

    let tier: Tier = "none";
    let scored: ScoredNode[] = [];
    let embeddingFailed = false;

    let queryVector: number[] | null = null;
    try {
      queryVector = await getEmbedding(question, "query");
    } catch {
      embeddingFailed = true;
    }
    if (!queryVector) embeddingFailed = true;

    if (queryVector && !embeddingFailed) {
      try {
        scored = await tryVectorSearchAtlas(db, repoFull, queryVector);
        if (scored.length) tier = "vector";
      } catch {
        /* Atlas vector index missing or error */
      }
      if (!scored.length) {
        scored = await tryInMemoryVector(db, repoFull, queryVector);
        if (scored.length) tier = "vector";
      }
    }

    if (!scored.length) {
      scored = await tryTextSearch(db, repoFull, question);
      if (scored.length) tier = "text";
    }

    if (!scored.length) {
      scored = await tryRegexFallback(db, repoFull, question);
      if (scored.length) tier = "regex";
    }

    if (!scored.length) {
      return c.json({
        answer:
          "I don't have enough indexed decisions that match that question. Try different keywords, or run **Build Knowledge Graph** if you haven't yet.",
        sources: [],
        searchTier: "none",
        nodesSearched: 0,
        nodesUsed: 0,
        geminiConfigured,
        synthesis: "none" as ChatSynthesis,
        model: GEMINI_CHAT_MODEL,
      });
    }

    const nodesSearched = scored.length;
    let usedNodes = dedupeByPr(scored).slice(0, 14);

    const CONTEXT_CHAR_CAP = 34000;
    const buildContext = (nodes: ScoredNode[]) => {
      const parts = nodes.map((x) => buildContextBlock(x.doc));
      return { parts, text: parts.join("\n\n") };
    };
    let { parts: contextParts, text: context } = buildContext(usedNodes);
    if (context.length > CONTEXT_CHAR_CAP) {
      usedNodes = usedNodes.slice(0, 10);
      ({ text: context } = buildContext(usedNodes));
    }
    if (context.length > CONTEXT_CHAR_CAP) {
      usedNodes = usedNodes.slice(0, 7);
      ({ text: context } = buildContext(usedNodes));
    }

    const systemPreamble = `You are GitLore, a senior staff engineer explaining this repository's history to a teammate. You write from the knowledge nodes only—no speculation, no outside knowledge.

Voice and quality:
- Write polished, readable prose: varied sentence length, smooth transitions ("Separately…", "Earlier…", "In the same area…"), and one main idea per paragraph.
- Open with a short, direct takeaway (2–4 sentences) that answers the question. Then add depth: context, tradeoffs, who was involved, and how PRs relate.
- Prefer concrete nouns and verbs from the nodes over vague phrases like "the team improved things." Tie claims to PR numbers, issue numbers, file paths, or quotes.
- When several PRs matter, organize logically (e.g. by theme or by merged_at order) and make the thread easy to follow.
- Do not pad with generic disclaimers. If evidence is thin, say exactly what the nodes show and what they omit, in one clear sentence.

Grounding (non-negotiable):
- Use ONLY facts in the nodes (title, summary, problem, decision, impact, alternatives, key_quotes, linked_issues, merge_commit, topics, full_narrative excerpt, pr_author, merged_at, type, changed_files). If the answer is not in the graph, say so and point to the closest PRs by title/summary.
- Never invent PR numbers, issues, URLs, dates, or quotes. When you quote discussion, use the exact wording from key_quotes and attribute the author from the node.
- "GitHub author (merge)" is the merger/author on the PR; reviewers in key_quotes may differ—state that distinction when it matters.

By question type:
- Why / tradeoffs: problem → alternatives → decision → impact; fold in quotes where they illuminate disagreement or consensus.
- What changed: summarize the change, mention type (feature/bugfix/refactor…), files or areas if listed, and outcomes from impact.
- Who: only people named as pr_author or in key_quotes (or clearly in node text). Otherwise say the graph does not name them.
- When / order: use merged_at to sequence; do not infer dates beyond what is given.
- Issues: report linked_issues and merge_commit as stored; if missing, say ingest may need a refresh.

Formatting:
- Plain paragraphs. Use bullet lists only if the user asks for a list or many parallel items would be clearer that way.
- Naturally weave in PR references (e.g. "In PR #42, …").`;

    const userMsg = `Below are knowledge nodes retrieved for this question. Read them carefully, then answer.

Knowledge nodes:
${context}

User question:
${question}

Instructions: Answer using only the nodes above. Be specific and well structured. If the question is narrow, stay focused; if it is broad, synthesize without losing accuracy.`;

    const configuredFallbacks = parseCommaModels(process.env.GEMINI_CHAT_MODEL_FALLBACKS);
    const chatFallbacks = configuredFallbacks.length
      ? configuredFallbacks
      : DEFAULT_CHAT_MODEL_FALLBACKS;
    const chatModelChain = [
      GEMINI_CHAT_MODEL,
      ...chatFallbacks.filter((m) => m !== GEMINI_CHAT_MODEL),
    ];

    let answer: string;
    let synthesis: ChatSynthesis = "none";
    let modelForResponse = GEMINI_CHAT_MODEL;
    if (!geminiConfigured) {
      synthesis = "fallback_no_key";
      answer =
        "GEMINI_API_KEY is not set in the GitLore **Backend** environment, so answers are not synthesized by Gemini. Add `GEMINI_API_KEY` to `GitLore/Backend/.env`, restart the API server, then ask again.\n\nClosest matching PR decisions from the index:\n\n" +
        usedNodes
          .map(
            (x) =>
              `• PR #${x.doc.pr_number} [${x.doc.type}]: ${x.doc.title}\n  ${String(x.doc.summary).slice(0, 280)}${String(x.doc.summary).length > 280 ? "…" : ""}`
          )
          .join("\n\n");
    } else {
      try {
        let lastErr: unknown;
        let geminiResult: { text: string; model: string } | null = null;
        for (let i = 0; i < chatModelChain.length; i++) {
          const modelName = chatModelChain[i];
          const isLast = i === chatModelChain.length - 1;
          try {
            const mdl = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: systemPreamble,
            } as Parameters<typeof genAI.getGenerativeModel>[0]);
            const run = () =>
              mdl.generateContent({
                contents: [{ role: "user", parts: [{ text: userMsg }] }],
                generationConfig: {
                  maxOutputTokens: 4096,
                  temperature: 0.42,
                  topP: 0.92,
                  topK: 40,
                },
              });
            const result = isLast
              ? await withGemini429Retry(run, { maxRetries: 2 })
              : await run();
            const text =
              result.response.candidates?.[0]?.content?.parts?.[0]?.text ||
              "Unable to generate a synthesized answer.";
            geminiResult = { text, model: modelName };
            break;
          } catch (e) {
            lastErr = e;
            if (isGeminiRateLimitError(e) && !isLast) {
              console.warn(
                `[chat] Model ${modelName} rate limited; trying ${chatModelChain[i + 1]}…`
              );
              continue;
            }
            throw e;
          }
        }
        if (!geminiResult) {
          throw lastErr instanceof Error
            ? lastErr
            : new Error("Gemini chat: no model succeeded");
        }
        answer = geminiResult.text;
        synthesis = "gemini";
        modelForResponse = geminiResult.model;
      } catch (err) {
        console.error("Gemini chat synthesis error:", err);
        synthesis = "fallback_error";
        const rateLimited = isGeminiRateLimitError(err);
        const keyInvalid = isGeminiApiKeyError(err);
        const quotaNote = rateLimited
          ? "Google returned HTTP 429 (rate limit or free-tier quota). Wait about a minute and try again, or review billing and limits: https://ai.google.dev/gemini-api/docs/rate-limits\n\n"
          : "";
        const keyNote = keyInvalid
          ? "Your Gemini API key was rejected (expired, revoked, or invalid). Create a new key in Google AI Studio (https://aistudio.google.com/apikey), set GEMINI_API_KEY in GitLore/Backend/.env, and restart the backend. Retrying will not help until the key is updated.\n\n"
          : "";
        answer =
          (keyInvalid
            ? "Gemini could not run because the API key is not valid.\n\n"
            : "Gemini synthesis failed (check API key, quota, and model name). Showing raw matches from the graph:\n\n") +
          keyNote +
          quotaNote +
          usedNodes
            .map(
              (x) =>
                `• PR #${x.doc.pr_number}: ${x.doc.title} — ${String(x.doc.summary).slice(0, 200)}…`
            )
            .join("\n");
      }
    }

    answer = answer + ingestNote;

    const sources = usedNodes.map((x) => ({
      pr_number: x.doc.pr_number as number,
      pr_url: String(x.doc.pr_url || ""),
      title: String(x.doc.title || ""),
      type: String(x.doc.type || "other"),
      score: Math.round(x.score * 1000) / 1000,
    }));

    return c.json({
      answer,
      sources,
      searchTier: tier,
      nodesSearched,
      nodesUsed: usedNodes.length,
      geminiConfigured,
      synthesis,
      model: modelForResponse,
    });
  } catch (error) {
    console.error("Chat error:", error);
    if (error instanceof z.ZodError) {
      return c.json(
        { error: "Invalid question (use 5–2000 characters)", details: error.errors },
        400
      );
    }
    return c.json({ error: "Failed to process question" }, 500);
  }
});
