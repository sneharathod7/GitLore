export type ParsedDiffLine = {
  type: "context" | "added" | "removed" | "header";
  content: string;
  lineNum?: number;
  path?: string | null;
};

/**
 * Parse a unified diff (e.g. GitHub `application/vnd.github.diff`) into renderable lines.
 * Tracks `path` from `+++ b/...` and `lineNum` on the PR head (right-hand) side.
 */
export function parseUnifiedDiff(diff: string): ParsedDiffLine[] {
  const lines = diff.split(/\r?\n/);
  const out: ParsedDiffLine[] = [];
  let newLine = 0;
  let currentPath: string | null = null;

  for (const raw of lines) {
    if (raw.startsWith("diff --git ")) {
      currentPath = null;
      newLine = 0;
      out.push({ type: "header", content: raw, path: currentPath });
      continue;
    }
    if (raw.startsWith("+++ b/")) {
      currentPath = raw.slice(6).replace(/\t.*$/, "").trim();
      out.push({ type: "header", content: raw, path: currentPath });
      continue;
    }
    if (raw.startsWith("--- a/") || raw.startsWith("--- /dev/null")) {
      out.push({ type: "header", content: raw, path: currentPath });
      continue;
    }
    if (raw.startsWith("@@")) {
      out.push({ type: "header", content: raw, path: currentPath });
      const m = raw.match(/\+(\d+)/);
      if (m) newLine = parseInt(m[1], 10) - 1;
      continue;
    }
    if (raw.startsWith("\\")) {
      out.push({ type: "header", content: raw, path: currentPath });
      continue;
    }
    if (raw.startsWith("+")) {
      newLine += 1;
      out.push({ type: "added", content: raw, lineNum: newLine, path: currentPath });
      continue;
    }
    if (raw.startsWith("-")) {
      out.push({ type: "removed", content: raw, path: currentPath ?? undefined });
      continue;
    }
    if (raw.length > 0 && raw[0] === " ") {
      newLine += 1;
      out.push({ type: "context", content: raw, lineNum: newLine, path: currentPath });
      continue;
    }
    out.push({ type: "context", content: raw, path: currentPath });
  }
  return out;
}

export function diffLinesToHunkString(lines: ParsedDiffLine[]): string {
  return lines.map((l) => l.content).join("\n");
}
