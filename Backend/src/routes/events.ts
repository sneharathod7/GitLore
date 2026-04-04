import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getDB } from "../lib/mongo";
import { getCurrentUser } from "../middleware/auth";
import { normalizeRepoKey } from "../lib/mongoAdvanced";

export const eventsRouter = new Hono();

function sseResumeId(change: { _id?: { _data?: unknown } | string }): string {
  const id = change._id;
  if (id && typeof id === "object" && "_data" in id && id._data != null) {
    return String(id._data);
  }
  try {
    return JSON.stringify(id ?? "");
  } catch {
    return String(Date.now());
  }
}

/**
 * GET /api/events/stream?repo=owner/name (required)
 * SSE when new rows appear in explanations_cache for that repo (requires replica set / Atlas).
 */
eventsRouter.get("/events/stream", (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const repoRaw = c.req.query("repo");
  if (typeof repoRaw !== "string" || !repoRaw.trim()) {
    return c.json({ error: "repo query parameter is required" }, 400);
  }
  const repoNorm = normalizeRepoKey(repoRaw);

  return streamSSE(c, async (stream) => {
    const db = getDB();
    const collection = db.collection("explanations_cache");

    const pipeline = [
      {
        $match: {
          operationType: { $in: ["insert", "replace", "update"] },
          "fullDocument.repo": repoNorm,
        },
      },
    ];

    let changeStream: ReturnType<typeof collection.watch>;
    try {
      changeStream = collection.watch(pipeline, {
        fullDocument: "updateLookup",
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Change streams require a replica set (e.g. MongoDB Atlas).";
      await stream.writeSSE({
        data: JSON.stringify({ error: msg }),
        event: "stream_error",
        id: "0",
      });
      return;
    }

    const keepalive = setInterval(() => {
      void stream.writeSSE({ data: "", event: "ping", id: "" });
    }, 30000);

    await stream.writeSSE({
      data: JSON.stringify({ connected: true, repo: repoNorm }),
      event: "connected",
      id: "0",
    });

    try {
      for await (const change of changeStream) {
        const doc = change.fullDocument as Record<string, unknown> | undefined;
        if (!doc) continue;

        const explanation = doc.explanation as Record<string, unknown> | undefined;
        const filePath =
          (typeof doc.file_path === "string" && doc.file_path) ||
          (typeof doc.filePath === "string" && doc.filePath) ||
          "";
        const line =
          typeof doc.line === "number"
            ? doc.line
            : typeof doc.line_number === "number"
              ? doc.line_number
              : undefined;

        await stream.writeSSE({
          data: JSON.stringify({
            type: change.operationType,
            file_path: filePath,
            line,
            pattern_name:
              (typeof explanation?.pattern_name === "string" && explanation.pattern_name) ||
              "Unknown pattern",
            confidence:
              (typeof explanation?.confidence === "string" && explanation.confidence) || "low",
            timestamp: new Date().toISOString(),
          }),
          event: "explanation_cached",
          id: sseResumeId(change),
        });
      }
    } catch (error) {
      console.error("Change stream (explanations) error:", error);
    } finally {
      clearInterval(keepalive);
      try {
        await changeStream.close();
      } catch {
        /* already closed */
      }
    }
  });
});

/**
 * GET /api/events/narratives?repo=owner/name (required)
 * SSE for new commit_cache narratives for that repo.
 */
eventsRouter.get("/events/narratives", (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  const repoRaw = c.req.query("repo");
  if (typeof repoRaw !== "string" || !repoRaw.trim()) {
    return c.json({ error: "repo query parameter is required" }, 400);
  }
  const repoNorm = normalizeRepoKey(repoRaw);

  return streamSSE(c, async (stream) => {
    const db = getDB();
    const collection = db.collection("commit_cache");

    const pipeline = [
      {
        $match: {
          operationType: { $in: ["insert", "replace", "update"] },
          "fullDocument.repo": repoNorm,
        },
      },
    ];

    let changeStream: ReturnType<typeof collection.watch>;
    try {
      changeStream = collection.watch(pipeline, {
        fullDocument: "updateLookup",
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Change streams require a replica set (e.g. MongoDB Atlas).";
      await stream.writeSSE({
        data: JSON.stringify({ error: msg }),
        event: "stream_error",
        id: "0",
      });
      return;
    }

    const keepalive = setInterval(() => {
      void stream.writeSSE({ data: "", event: "ping", id: "" });
    }, 30000);

    await stream.writeSSE({
      data: JSON.stringify({ connected: true, repo: repoNorm }),
      event: "connected",
      id: "0",
    });

    try {
      for await (const change of changeStream) {
        const doc = change.fullDocument as Record<string, unknown> | undefined;
        if (!doc) continue;
        const narrative = doc.narrative as Record<string, unknown> | undefined;

        await stream.writeSSE({
          data: JSON.stringify({
            type: change.operationType,
            sha: typeof doc.sha === "string" ? doc.sha : "",
            one_liner:
              (typeof narrative?.one_liner === "string" && narrative.one_liner) ||
              (typeof doc.message === "string" && doc.message) ||
              "",
            confidence:
              (typeof narrative?.confidence === "string" && narrative.confidence) || "low",
            file_path: typeof doc.file_path === "string" ? doc.file_path : "",
            timestamp: new Date().toISOString(),
          }),
          event: "narrative_cached",
          id: sseResumeId(change),
        });
      }
    } catch (error) {
      console.error("Change stream (narratives) error:", error);
    } finally {
      clearInterval(keepalive);
      try {
        await changeStream.close();
      } catch {
        /* already closed */
      }
    }
  });
});
