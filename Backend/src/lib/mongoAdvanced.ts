/**
 * Atlas Search + Vector Search features ($rankFusion, $facet analytics).
 * Requires MongoDB 8.0+ Atlas with the indexes named in the GitLore PRD.
 * Call sites should catch errors and fall back when indexes are missing.
 */

import type { Document } from "mongodb";
import { getDB } from "./mongo";

/** Normalize owner/name repo key (lowercase, no leading slashes). */
export function normalizeRepoKey(repo: string): string {
  return repo.trim().replace(/^\/+|\/+$/g, "").toLowerCase();
}

/**
 * Hybrid search: vector similarity + Atlas full-text via $rankFusion (RRF).
 * @see https://www.mongodb.com/docs/manual/reference/operator/aggregation/rankFusion/
 */
export async function hybridPatternSearch(
  queryEmbedding: number[],
  queryText: string,
  limit = 5
): Promise<Document[]> {
  const db = getDB();
  const lim = Math.max(1, Math.min(limit, 25));
  const pipeline: Document[] = [
    {
      $rankFusion: {
        input: {
          pipelines: {
            vectorSearch: [
              {
                $vectorSearch: {
                  index: "patterns_vector_index",
                  path: "embedding",
                  queryVector: queryEmbedding,
                  numCandidates: lim * 10,
                  limit: lim * 2,
                },
              },
            ],
            textSearch: [
              {
                $search: {
                  index: "patterns_text_index",
                  compound: {
                    should: [
                      {
                        text: {
                          query: queryText,
                          path: "pattern_name",
                          score: { boost: { value: 2 } },
                        },
                      },
                      {
                        text: {
                          query: queryText,
                          path: "trigger_keywords",
                          score: { boost: { value: 1.5 } },
                        },
                      },
                      { text: { query: queryText, path: "explanation_template" } },
                    ],
                    minimumShouldMatch: 1,
                  },
                },
              },
              { $limit: lim * 2 },
            ],
          },
        },
        combination: {
          weights: {
            vectorSearch: 0.6,
            textSearch: 0.4,
          },
        },
      },
    },
    { $limit: lim },
    {
      $project: {
        _id: 1,
        pattern_name: 1,
        trigger_keywords: 1,
        explanation_template: 1,
        anti_pattern: 1,
        correct_pattern: 1,
        docs_links: 1,
        score: { $meta: "searchScore" },
      },
    },
  ];
  return db.collection("comment_patterns").aggregate(pipeline).toArray();
}

export async function hybridDecisionSearch(
  queryEmbedding: number[],
  queryText: string,
  repo: string,
  limit = 5
): Promise<Document[]> {
  const db = getDB();
  const lim = Math.max(1, Math.min(limit, 25));
  const repoKey = normalizeRepoKey(repo);
  const pipeline: Document[] = [
    {
      $rankFusion: {
        input: {
          pipelines: {
            vectorSearch: [
              {
                $vectorSearch: {
                  index: "commit_vector_index",
                  path: "embedding",
                  queryVector: queryEmbedding,
                  numCandidates: lim * 10,
                  limit: lim * 2,
                  filter: { repo: repoKey },
                },
              },
            ],
            textSearch: [
              {
                $search: {
                  index: "commit_text_index",
                  compound: {
                    should: [
                      { text: { query: queryText, path: "narrative.one_liner" } },
                      { text: { query: queryText, path: "narrative.context" } },
                      { text: { query: queryText, path: "narrative.debate" } },
                      { text: { query: queryText, path: "message" } },
                    ],
                    minimumShouldMatch: 1,
                  },
                },
              },
              { $match: { repo: repoKey } },
              { $limit: lim * 2 },
            ],
          },
        },
        combination: {
          weights: { vectorSearch: 0.6, textSearch: 0.4 },
        },
      },
    },
    { $limit: lim },
    {
      $project: {
        _id: 1,
        message: 1,
        file_path: 1,
        line_number: 1,
        sha: 1,
        repo: 1,
        "narrative.one_liner": 1,
        score: { $meta: "searchScore" },
      },
    },
  ];
  return db.collection("commit_cache").aggregate(pipeline).toArray();
}

export type RepoAnalyticsResult = {
  confidenceBreakdown: Array<{ _id: string | null; count: number }>;
  dataSignals: Array<{ _id: string; count: number }>;
  fileHeatmap: Array<{
    _id: string | null;
    analysisCount: number;
    avgConfidence: number | null;
  }>;
  timeline: Array<{ _id: string; count: number }>;
  totals: Array<{
    totalAnalyses: number;
    uniqueFiles: number;
    uniqueAuthors: number;
  }>;
};

export async function getRepoAnalytics(repo: string): Promise<RepoAnalyticsResult> {
  const db = getDB();
  const repoKey = normalizeRepoKey(repo);

  const results = await db
    .collection("commit_cache")
    .aggregate([
      { $match: { repo: repoKey } },
      {
        $facet: {
          confidenceBreakdown: [
            {
              $group: {
                _id: "$narrative.confidence",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
          ],
          dataSignals: [
            {
              $addFields: {
                _signals: {
                  $ifNull: ["$narrative.sources.data_signals", []],
                },
              },
            },
            {
              $unwind: {
                path: "$_signals",
                preserveNullAndEmptyArrays: false,
              },
            },
            {
              $match: {
                _signals: { $type: "string", $ne: "" },
              },
            },
            {
              $group: {
                _id: "$_signals",
                count: { $sum: 1 },
              },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
          ],
          fileHeatmap: [
            {
              $group: {
                _id: "$file_path",
                analysisCount: { $sum: 1 },
                avgConfidence: {
                  $avg: {
                    $switch: {
                      branches: [
                        {
                          case: { $eq: ["$narrative.confidence", "high"] },
                          then: 3,
                        },
                        {
                          case: { $eq: ["$narrative.confidence", "medium"] },
                          then: 2,
                        },
                        {
                          case: { $eq: ["$narrative.confidence", "low"] },
                          then: 1,
                        },
                      ],
                      default: 0,
                    },
                  },
                },
              },
            },
            { $sort: { analysisCount: -1 } },
            { $limit: 20 },
          ],
          timeline: [
            {
              $match: {
                created_at: { $exists: true, $type: "date" },
              },
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$created_at" },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalAnalyses: { $sum: 1 },
                uniqueFiles: { $addToSet: "$file_path" },
                uniqueAuthors: { $addToSet: "$author" },
              },
            },
            {
              $project: {
                _id: 0,
                totalAnalyses: 1,
                uniqueFiles: {
                  $size: {
                    $filter: {
                      input: "$uniqueFiles",
                      as: "f",
                      cond: { $ne: ["$$f", null] },
                    },
                  },
                },
                uniqueAuthors: {
                  $size: {
                    $filter: {
                      input: "$uniqueAuthors",
                      as: "a",
                      cond: { $ne: ["$$a", null] },
                    },
                  },
                },
              },
            },
          ],
        },
      },
    ])
    .toArray();

  const row = results[0] as RepoAnalyticsResult | undefined;
  const emptyTotals = { totalAnalyses: 0, uniqueFiles: 0, uniqueAuthors: 0 };
  if (!row) {
    return {
      confidenceBreakdown: [],
      dataSignals: [],
      fileHeatmap: [],
      timeline: [],
      totals: [emptyTotals],
    };
  }
  const totals =
    row.totals?.length > 0 ? row.totals : [emptyTotals];
  return { ...row, totals };
}

export async function getPatternDistribution(
  repo?: string
): Promise<Array<{ _id: string | null; count: number; avgConfidence: number | null }>> {
  const db = getDB();
  const matchStage: Document = repo
    ? { $match: { repo: normalizeRepoKey(repo) } }
    : { $match: {} };

  return db
    .collection("explanations_cache")
    .aggregate([
      matchStage,
      {
        $group: {
          _id: "$explanation.pattern_name",
          count: { $sum: 1 },
          avgConfidence: {
            $avg: {
              $switch: {
                branches: [
                  { case: { $eq: ["$explanation.confidence", "high"] }, then: 3 },
                  { case: { $eq: ["$explanation.confidence", "medium"] }, then: 2 },
                ],
                default: 1,
              },
            },
          },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ])
    .toArray() as Promise<
    Array<{ _id: string | null; count: number; avgConfidence: number | null }>
  >;
}
