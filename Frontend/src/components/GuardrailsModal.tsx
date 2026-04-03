import { useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { animate } from "animejs";

const ALLOWED = [
  "Analyze public repos",
  "Generate narratives",
  "Explain review comments",
  "Search similar decisions",
  "Generate voice narration",
];

const BLOCKED = [
  "Access private repos without auth",
  "Modify code",
  "Post comments on behalf of user",
  "Generate medical/legal advice",
  "Access user credentials",
];

const BLOCKED_KEYWORDS = ["modify", "delete", "access credentials", "post comment", "private repo", "medical", "legal"];

export const GuardrailsModal = ({ onClose }: { onClose: () => void }) => {
  const [testInput, setTestInput] = useState("");
  const [result, setResult] = useState<{ type: "allowed" | "blocked"; text: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.from(modalRef.current, { scale: 0.95, opacity: 0, duration: 0.25, ease: "power2.out" });
    }
  }, []);

  const handleCheck = () => {
    if (!testInput.trim()) return;
    const lower = testInput.toLowerCase();
    const isBlocked = BLOCKED_KEYWORDS.some((kw) => lower.includes(kw));

    if (isBlocked) {
      setResult({ type: "blocked", text: `BLOCKED: ${testInput} violates security policy` });
      if (inputRef.current) {
        animate(inputRef.current, {
          borderColor: ["rgba(255,255,255,0.1)", "#F87171", "rgba(255,255,255,0.1)"],
          duration: 600,
          ease: "outQuad",
        });
      }
    } else {
      setResult({ type: "allowed", text: `AUTHORIZED: ${testInput}` });
      if (inputRef.current) {
        animate(inputRef.current, {
          borderColor: ["rgba(255,255,255,0.1)", "#34D399", "rgba(255,255,255,0.1)"],
          duration: 600,
          ease: "outQuad",
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0A0A0F]/80" onClick={onClose} aria-hidden />
      <div
        ref={modalRef}
        className="relative z-[1] max-h-[90vh] w-full max-w-none overflow-y-auto rounded-[6px] border border-gitlore-border bg-gitlore-surface p-4 sm:max-w-[600px] sm:p-6"
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 text-lg leading-none text-gitlore-text-secondary transition-colors hover:text-gitlore-text sm:right-4 sm:top-4"
          type="button"
          aria-label="Close"
        >
          ×
        </button>

        <h2 className="mb-6 pr-8 text-lg font-heading font-bold text-gitlore-text md:max-lg:text-[15px] lg:text-lg">AI Guardrails</h2>

        <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gitlore-success" />
              <span className="text-sm font-medium text-gitlore-text">Allowed</span>
            </div>
            <ul className="space-y-2">
              {ALLOWED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-snug text-gitlore-text-secondary">
                  <span className="shrink-0 text-gitlore-success">{"\u2713"}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-gitlore-error" />
              <span className="text-sm font-medium text-gitlore-text">Blocked</span>
            </div>
            <ul className="space-y-2">
              {BLOCKED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-snug text-gitlore-text-secondary">
                  <span className="shrink-0 text-gitlore-error">{"\u2717"}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="Test an action..."
            value={testInput}
            onChange={(e) => {
              setTestInput(e.target.value);
              setResult(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            className="min-h-[44px] flex-1 rounded-[6px] border border-gitlore-border bg-gitlore-code px-3 py-2 font-body text-sm text-gitlore-text outline-none transition-colors placeholder:text-gitlore-text-secondary/50 focus:border-gitlore-accent"
          />
          <button
            onClick={handleCheck}
            type="button"
            className="min-h-[44px] shrink-0 rounded-[6px] bg-gitlore-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gitlore-accent-hover"
          >
            Check
          </button>
        </div>

        {result && (
          <p className={`font-code text-xs sm:text-sm ${result.type === "blocked" ? "text-gitlore-error" : "text-gitlore-success"}`}>{result.text}</p>
        )}
      </div>
    </div>
  );
};
