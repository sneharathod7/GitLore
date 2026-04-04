import { useRef, useEffect, useState } from "react";
import { animate } from "animejs";

const labels = [
  "reference pattern examples",
  "average context assembly",
  "competitors built for review receivers",
];

const StatsBar = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [nums, setNums] = useState<[string, string, string]>(["0", "0s", "0"]);
  const [countStarted, setCountStarted] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || countStarted) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setCountStarted(true);
        const o0 = { v: 0 };
        const o1 = { v: 0 };
        const o2 = { v: 0 };
        animate(o0, {
          v: 10,
          duration: 800,
          ease: "outExpo",
          onUpdate: () => setNums((p) => [`${Math.round(o0.v)}`, p[1], p[2]]),
        });
        animate(o1, {
          v: 3,
          duration: 800,
          ease: "outExpo",
          onUpdate: () => setNums((p) => [p[0], `${o1.v.toFixed(0)}s`, p[2]]),
        });
        animate(o2, {
          v: 0,
          duration: 800,
          ease: "outExpo",
          onUpdate: () => setNums((p) => [p[0], p[1], `${Math.round(o2.v)}`]),
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.2 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, [countStarted]);

  return (
    <section ref={sectionRef} className="border-y border-[var(--border)] bg-[var(--surface)] py-20 md:py-28">
      <div className="landing-container">
        <div className="grid grid-cols-1 md:grid-cols-3">
          {labels.map((label, i) => (
            <div
              key={label}
              className={`flex flex-col px-4 py-8 md:px-10 md:py-6 ${i < labels.length - 1 ? "border-b md:border-b-0 md:border-r" : ""}`}
              
            >
              <span
                className="font-heading text-[48px] font-bold leading-none tracking-[-0.04em] text-[var(--accent)] tabular-nums md:text-[72px]"
              >
                {nums[i]}
              </span>
              <span className="font-body mt-1 text-[13px] font-normal text-[var(--text-secondary)]">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsBar;
