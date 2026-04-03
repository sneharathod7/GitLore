import { FadeIn } from "../effects/FadeIn";

const GithubMark = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0 opacity-90" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const stepMeta = {
  border: "var(--border)",
  borderStrong: "var(--border-strong)",
} as const;

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="border-t py-20 md:py-28" style={{ borderColor: stepMeta.border, background: "var(--bg)" }}>
      <div className="landing-container">
        <div className="section-label !mb-14 md:!mb-16">
          <p>Three steps</p>
        </div>

        <FadeIn direction="up">
          <div
            className="overflow-hidden rounded-xl border md:grid md:grid-cols-3 md:divide-x md:divide-y-0 md:divide-gitlore-border"
            style={{
              borderColor: stepMeta.border,
              background: "var(--surface)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Step 01 */}
            <div className="flex flex-col border-b px-6 py-10 md:border-b-0 md:px-8 md:py-12 lg:px-10" style={{ borderColor: stepMeta.border }}>
              <span
                className="font-heading text-[36px] font-bold tabular-nums leading-none tracking-[-0.04em] md:text-[44px] lg:text-[48px]"
                style={{ color: "var(--text-ghost)" }}
                aria-hidden
              >
                01
              </span>
              <h3
                className="mt-3 font-heading text-[19px] font-bold leading-tight tracking-[-0.025em] md:text-[21px]"
                style={{ color: "var(--text)" }}
              >
                Connect your repo
              </h3>
              <p
                className="mt-3 max-w-[34ch] font-body text-[14px] font-normal leading-[1.75] md:text-[15px]"
                style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
              >
                Authorize GitHub and pick a public repository. GitLore indexes decisions and review threads automatically.
              </p>
              <div className="mt-auto pt-8">
                {/* Read-only “indexed repo” summary — not a URL bar or connect CTA */}
                <div className="overflow-hidden rounded-md border" style={{ borderColor: stepMeta.border, background: "var(--elevated)" }}>
                  <div
                    className="flex items-center justify-between gap-2 border-b px-3 py-2"
                    style={{ borderColor: stepMeta.border, background: "var(--surface-active)" }}
                  >
                    <span className="font-code text-[9px] font-medium uppercase tracking-[2.5px]" style={{ color: "var(--text-ghost)" }}>
                      Data source
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 font-code text-[9px] font-medium uppercase tracking-wide"
                      style={{
                        color: "var(--success)",
                        background: "var(--success-dim)",
                        border: "1px solid rgba(52, 211, 153, 0.25)",
                      }}
                    >
                      Linked
                    </span>
                  </div>
                  <div className="px-3 py-3">
                    <div className="flex gap-3">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border"
                        style={{ borderColor: stepMeta.border, background: "var(--surface)", color: "var(--text)" }}
                        aria-hidden
                      >
                        <GithubMark />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-code text-[12px] font-semibold tracking-[0.02em]" style={{ color: "var(--text)" }}>
                          <span style={{ color: "var(--text-secondary)" }}>acme-org</span>
                          <span style={{ color: "var(--text-ghost)" }}> / </span>
                          <span>payments-api</span>
                        </p>
                        <p className="mt-1 font-code text-[10px] leading-relaxed" style={{ color: "var(--text-ghost)" }}>
                          Default branch <span style={{ color: "var(--text-secondary)" }}>main</span>
                          <span className="mx-1.5 opacity-40" aria-hidden>
                            ·
                          </span>
                          Read-only
                          <span className="mx-1.5 opacity-40" aria-hidden>
                            ·
                          </span>
                          Public
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 border-t pt-3 font-code text-[10px] leading-relaxed" style={{ borderColor: stepMeta.border, color: "var(--text-ghost)" }}>
                      <span className="text-gitlore-text-secondary">Indexed</span> 3.1k files · PRs &amp; issues · last sync 2m ago
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 02 */}
            <div className="flex flex-col border-b px-6 py-10 md:border-b-0 md:px-8 md:py-12 lg:px-10" style={{ borderColor: stepMeta.border }}>
              <span
                className="font-heading text-[36px] font-bold tabular-nums leading-none tracking-[-0.04em] md:text-[44px] lg:text-[48px]"
                style={{ color: "var(--text-ghost)" }}
                aria-hidden
              >
                02
              </span>
              <h3
                className="mt-3 font-heading text-[19px] font-bold leading-tight tracking-[-0.025em] md:text-[21px]"
                style={{ color: "var(--text)" }}
              >
                Click anything
              </h3>
              <p
                className="mt-3 max-w-[34ch] font-body text-[14px] font-normal leading-[1.75] md:text-[15px]"
                style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
              >
                Line numbers, review comments, or symbols — the same gesture everywhere.
              </p>
              <div className="mt-auto pt-8">
                <div
                  className="overflow-hidden rounded-md border font-code text-[11px] leading-6 md:text-[12px]"
                  style={{ borderColor: stepMeta.border, background: "var(--code-bg)" }}
                >
                  <div className="flex border-b px-0" style={{ borderColor: stepMeta.border }}>
                    <div className="w-9 shrink-0 select-none border-r py-2 text-right pr-2 tabular-nums" style={{ borderColor: stepMeta.border, color: "var(--text-ghost)" }}>
                      4
                    </div>
                    <div className="min-w-0 flex-1 py-2 pl-3 pr-3" style={{ color: "var(--text-code)" }}>
                      return useMemo(() =&gt; compute(), [deps])
                    </div>
                  </div>
                  <div
                    className="flex border-b px-0"
                    style={{
                      borderColor: stepMeta.border,
                      background: "var(--code-highlight)",
                      boxShadow: "inset 3px 0 0 var(--accent)",
                    }}
                  >
                    <div className="w-9 shrink-0 select-none border-r py-2 text-right pr-2 tabular-nums font-semibold" style={{ borderColor: stepMeta.border, color: "var(--accent)" }}>
                      5
                    </div>
                    <div className="min-w-0 flex-1 py-2 pl-3 pr-3 font-medium" style={{ color: "var(--text)" }}>
                      const x = heavy()
                    </div>
                  </div>
                  <div className="flex px-0">
                    <div className="w-9 shrink-0 select-none border-r py-2 text-right pr-2 tabular-nums" style={{ borderColor: stepMeta.border, color: "var(--text-ghost)" }}>
                      6
                    </div>
                    <div className="min-w-0 flex-1 py-2 pl-3 pr-3" style={{ color: "var(--text-code)" }}>
                      return x
                    </div>
                  </div>
                  <p className="border-t px-3 py-2 font-code text-[10px] font-normal tracking-wide" style={{ borderColor: stepMeta.border, color: "var(--text-ghost)" }}>
                    ← click any line
                  </p>
                </div>
              </div>
            </div>

            {/* Step 03 */}
            <div className="flex flex-col px-6 py-10 md:px-8 md:py-12 lg:px-10">
              <span
                className="font-heading text-[36px] font-bold tabular-nums leading-none tracking-[-0.04em] md:text-[44px] lg:text-[48px]"
                style={{ color: "var(--text-ghost)" }}
                aria-hidden
              >
                03
              </span>
              <h3
                className="mt-3 font-heading text-[19px] font-bold leading-tight tracking-[-0.025em] md:text-[21px]"
                style={{ color: "var(--text)" }}
              >
                Get the story
              </h3>
              <p
                className="mt-3 max-w-[34ch] font-body text-[14px] font-normal leading-[1.75] md:text-[15px]"
                style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}
              >
                Narrative, linked sources, and confidence — without leaving the file.
              </p>
              <div className="mt-auto pt-8">
                <div
                  className="relative overflow-hidden rounded-md border"
                  style={{
                    borderColor: stepMeta.border,
                    background: "var(--elevated)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
                  }}
                >
                  <div className="border-t" style={{ borderColor: "var(--border-accent)" }} aria-hidden />
                  <div className="p-4 pt-3.5">
                    <span
                      className="absolute right-3 top-3 rounded border px-1.5 py-0.5 font-code text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--success)",
                        borderColor: "rgba(52, 211, 153, 0.35)",
                        background: "var(--success-dim)",
                      }}
                    >
                      HIGH
                    </span>
                    <p className="max-w-[95%] pr-12 font-body text-[12px] font-normal leading-[1.65] md:text-[13px]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
                      Introduced in PR #412 after latency regression in checkout. Chosen over polling…
                    </p>
                    <p className="mt-3 font-code text-[11px] font-medium tracking-[0.02em] text-gitlore-text-secondary transition-colors duration-200 hover:text-gitlore-accent">
                      → PR #847
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

export default HowItWorks;
