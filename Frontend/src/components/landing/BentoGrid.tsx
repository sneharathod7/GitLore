import { FadeIn } from "../effects/FadeIn";

const leftLines = ["useEffect(() => {", "  fetchUser(id)", "}, [])"];

const rightLines = [
  "useEffect(() => {",
  "  const ctrl = new AbortController()",
  "  fetchUser(id, { signal: ctrl.signal })",
  "  return () => ctrl.abort()",
  "}, [id])",
];

const LIT_PATTERN_CELLS = new Set([0, 1, 2, 7, 12]);

const BentoGrid = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="landing-container">
        <FadeIn direction="up">
          <div className="section-label">
            <p>What GitLore does</p>
          </div>
          <div className="grid gap-px overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--border)] md:grid-cols-2">
            <div className="bento-card md:col-span-2">
              <div className="bg-[var(--surface)] px-7 pb-6 pt-7">
                <div className="mb-5">
                  <h3 className="font-heading text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">Review Explainer</h3>
                  <p className="mt-1 max-w-[520px] font-body text-[14px] font-normal leading-[1.65] tracking-[-0.01em] text-[var(--text-secondary)]">
                    Click any review comment. Get the explanation, the fix, and the principle - with source links to the original PR discussion.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-[var(--border)] bg-[var(--border)] font-code text-[11px] sm:grid-cols-[1fr_1fr] sm:text-[12px]">
                  <div className="space-y-0 bg-[var(--code-removed)]">
                    {leftLines.map((line, i) => (
                      <div key={i} className="bento-diff-line px-3 py-1 tracking-[0.01em] text-[var(--error)]">
                        {line}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-0 bg-[var(--code-added)]">
                    {rightLines.map((line, i) => (
                      <div key={i} className="bento-diff-line bento-diff-line--right px-3 py-1 tracking-[0.01em] text-[var(--success)]">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bento-card">
              <div className="bg-[var(--surface)] px-7 pb-6 pt-7">
                <h3 className="font-heading text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">Code Archaeology</h3>
                <p className="mt-1 font-body text-[14px] font-normal leading-[1.65] tracking-[-0.01em] text-[var(--text-secondary)]">
                  Click any line. See why it exists - the full decision story from git history.
                </p>
                <div className="mt-5 flex items-center justify-center">
                  <svg width="220" height="40" viewBox="0 0 220 40" aria-hidden>
                    <path className="bento-timeline-path" d="M 12 20 L 72 20 L 132 20 L 192 20" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="2" />
                    <circle cx="12" cy="20" r="5" fill="var(--accent)" opacity={0.95} />
                    <circle cx="72" cy="20" r="5" fill="var(--accent)" opacity={0.95} />
                    <circle cx="132" cy="20" r="5" fill="var(--accent)" opacity={0.95} />
                    <circle cx="192" cy="20" r="5" fill="var(--accent)" opacity={0.95} />
                  </svg>
                </div>
                <div className="mt-2 flex justify-between px-2 font-code text-[10px] font-normal tracking-[0.01em] text-[var(--text-secondary)]">
                  <span>Issue</span>
                  <span>PR</span>
                  <span>Review</span>
                  <span>Merge</span>
                </div>
              </div>
            </div>

            <div className="bento-card">
              <div className="bg-[var(--surface)] px-7 pb-6 pt-7">
                <h3 className="font-heading text-[18px] font-semibold tracking-[-0.02em] text-[var(--text)]">Pattern Library</h3>
                <p className="mt-1 font-body text-[14px] font-normal leading-[1.65] tracking-[-0.01em] text-[var(--text-secondary)]">
                  20 pre-loaded anti-patterns. Memory leaks, N+1 queries, XSS, SQL injection - matched automatically.
                </p>
                <div className="mx-auto mt-5 grid w-max grid-cols-5 gap-1">
                  {Array.from({ length: 20 }).map((_, i) => {
                    const isLit = LIT_PATTERN_CELLS.has(i);
                    return (
                      <div
                        key={i}
                        className={`h-6 w-6 rounded-[3px] border bg-[var(--surface-active)] ${isLit ? "border-[var(--border-strong)]" : "border-[var(--border)]"}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default BentoGrid;
