import { Link } from "react-router-dom";

const footerLinkClass =
  "font-body text-[13px] font-normal tracking-[-0.01em] text-gitlore-text-secondary transition-colors duration-200 hover:text-gitlore-text";

const FooterColTitle = ({ children }: { children: string }) => (
  <p className="mb-4 font-code text-[10px] font-medium uppercase tracking-[3px]" style={{ color: "var(--text-ghost)" }}>
    {children}
  </p>
);

const LandingFooter = () => {
  return (
    <footer className="border-t" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="landing-container">
        {/* Primary footer */}
        <div className="grid grid-cols-1 gap-12 py-14 md:grid-cols-12 md:gap-10 md:py-16 lg:gap-12">
          {/* Brand */}
          <div className="md:col-span-5 lg:col-span-4">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-[1px]" style={{ background: "var(--accent)" }} aria-hidden />
              <span className="font-heading text-[17px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                GitLore
              </span>
            </Link>
            <p className="mt-4 max-w-[280px] font-body text-[14px] font-normal leading-[1.65]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
              Context for every line you ship — PRs, reviews, and history in one click.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/app"
                className="inline-flex h-9 items-center rounded-[4px] px-4 font-heading text-[12px] font-medium text-white transition-[filter] duration-200 hover:brightness-110"
                style={{ background: "var(--accent)" }}
              >
                Open app
              </Link>
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-[4px] border border-solid px-4 font-heading text-[12px] font-medium transition-colors duration-200"
                style={{
                  borderColor: "var(--border-strong)",
                  color: "var(--text-secondary)",
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--text-secondary)";
                  e.currentTarget.style.color = "var(--text)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-strong)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Product */}
          <nav className="md:col-span-3 lg:col-span-2" aria-label="Product">
            <FooterColTitle>Product</FooterColTitle>
            <ul className="flex flex-col gap-2.5">
              <li>
                <a href="#live-demo" className={footerLinkClass}>
                  Try the demo
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={footerLinkClass}>
                  How it works
                </a>
              </li>
              <li>
                <Link to="/app" className={footerLinkClass}>
                  GitLore workspace
                </Link>
              </li>
            </ul>
          </nav>

          {/* Explore */}
          <nav className="md:col-span-4 lg:col-span-3" aria-label="Explore">
            <FooterColTitle>Explore</FooterColTitle>
            <ul className="flex flex-col gap-2.5">
              <li>
                <Link to="/overview" className={footerLinkClass}>
                  Overview
                </Link>
              </li>
              <li>
                <Link to="/patterns" className={footerLinkClass}>
                  Pattern library
                </Link>
              </li>
              <li>
                <Link to="/" className={footerLinkClass}>
                  Home
                </Link>
              </li>
            </ul>
          </nav>

          {/* Build / event */}
          <div className="md:col-span-12 lg:col-span-3 lg:border-l lg:pl-10" style={{ borderColor: "var(--border)" }}>
            <FooterColTitle>Build</FooterColTitle>
            <p className="font-body text-[13px] font-normal leading-[1.7]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
              Hackathon prototype built for real review workflows — not a generic chat wrapper.
            </p>
            <p className="mt-4 font-code text-[11px] font-normal leading-relaxed" style={{ color: "var(--text-ghost)", letterSpacing: "0.02em" }}>
              HackByte 4.0 · IIITDM Jabalpur · April 2026
            </p>
          </div>
        </div>

        {/* Trust & data */}
        <div className="border-t py-8" style={{ borderColor: "var(--border)" }}>
          <div className="rounded-md border px-4 py-4 md:px-5 md:py-4" style={{ borderColor: "var(--border)", background: "var(--elevated)" }}>
            <p className="font-code text-[10px] font-medium uppercase tracking-[2px]" style={{ color: "var(--text-ghost)" }}>
              Data &amp; privacy
            </p>
            <p className="mt-2 max-w-[720px] font-body text-[12px] font-normal leading-[1.7] md:text-[13px]" style={{ color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
              GitLore reads repository metadata through the GitHub API. Your code stays on GitHub&apos;s infrastructure. We don&apos;t use your
              repositories to train models.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col items-center justify-between gap-3 py-5 sm:flex-row sm:gap-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="order-2 font-code text-[10px] font-normal sm:order-1" style={{ color: "var(--text-ghost)", letterSpacing: "0.04em" }}>
            © {new Date().getFullYear()} GitLore · HackByte 4.0
          </p>
          <div className="order-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:order-2 sm:justify-end">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={footerLinkClass}>
              Source &amp; issues
            </a>
            <a href="#live-demo" className={footerLinkClass}>
              Back to demo
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
