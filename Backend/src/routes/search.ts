import { Hono } from "hono";
import { z } from "zod";
import { getDB } from "../lib/mongo";
import { getCurrentUser } from "../middleware/auth";
import { getEmbedding } from "../lib/gemini";

export const searchRouter = new Hono();

// Schema for search request
const searchRequestSchema = z.object({
  repo: z.string().describe("Repository in format owner/name"),
  query: z.string().describe("Search query (e.g., 'caching decisions')"),
  limit: z.number().default(5).describe("Number of results"),
});

type SearchRequest = z.infer<typeof searchRequestSchema>;

/**
 * POST /api/search
 * Vector search for similar decisions in commit history
 */
searchRouter.post("/search", async (c) => {
  try {
    const user = getCurrentUser(c);
    if (!user) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    // Parse and validate request
    const body = await c.req.json();
    const request = searchRequestSchema.parse(body);

    const queryEmbedding = await getEmbedding(request.query, "query");
    if (!queryEmbedding) {
      return c.json({
        query: request.query,
        results: [] as Array<Record<string, unknown>>,
        total: 0,
        note: "Embeddings unavailable. Set GEMINI_API_KEY and GEMINI_EMBEDDING_MODELS on the server.",
      });
    }

    const db = getDB();

    const repoNorm = request.repo.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
    const repoPattern = new RegExp(
      `^${repoNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
      "i"
    );

    const allResults = await db
      .collection("commit_cache")
      .find({ repo: repoPattern })
      .limit(400)
      .toArray();

    const scoredResults = allResults
      .map((doc: any) => {
        const emb = doc.embedding as number[] | undefined;
        const similarity =
          Array.isArray(emb) && emb.length > 0 && emb.length === queryEmbedding.length
            ? cosineSimilarity(queryEmbedding, emb)
            : 0;
        return {
          sha: doc.sha,
          file_path: doc.file_path as string,
          line_number: doc.line_number as number,
          one_liner: (doc.narrative?.one_liner as string) || (doc.message as string) || "",
          score: similarity,
          source: `${repoNorm}:${doc.file_path}#L${doc.line_number}`,
        };
      })
      .filter((r) => r.one_liner)
      .sort((a, b) => b.score - a.score)
      .slice(0, request.limit);

    return c.json({
      query: request.query,
      results: scoredResults,
      total: scoredResults.length,
    });
  } catch (error) {
    console.error("Search error:", error);

    if (error instanceof z.ZodError) {
      return c.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        400
      );
    }

    return c.json(
      {
        error: "Search failed",
        message:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : undefined,
      },
      500
    );
  }
});

/**
 * Helper: Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}
