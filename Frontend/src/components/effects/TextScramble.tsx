import { useRef, useEffect, useState } from "react";
import { observeOnceCallback, type InViewOptions } from "./in-view";

export interface TextScrambleProps extends InViewOptions {
  text: string;
  className?: string;
  speed?: number;
}

export function TextScramble({
  text,
  className = "",
  speed = 30,
  threshold = 0.1,
  rootMargin = "0px",
}: TextScrambleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    hasRun.current = false;
    setDisplay("");

    const el = ref.current;
    if (!el) return;

    const scramble = () => {
      const chars = "!<>-_\\/[]{}=+*^?#";
      let iteration = 0;
      const interval = setInterval(() => {
        setDisplay(
          text
            .split("")
            .map((char, i) => {
              if (char === " ") return " ";
              if (i < iteration) return text[i];
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join(""),
        );
        if (iteration >= text.length) clearInterval(interval);
        iteration += 1 / 3;
      }, speed);
    };

    return observeOnceCallback(
      el,
      () => {
        if (hasRun.current) return;
        hasRun.current = true;
        scramble();
      },
      { threshold, rootMargin },
    );
  }, [text, speed, threshold, rootMargin]);

  return (
    <span ref={ref} className={className.trim()}>
      {display || text}
    </span>
  );
}
