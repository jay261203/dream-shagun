"use client";

import { useEffect, useRef, useState } from "react";

/**
 * One statement whose words turn from grey to ink as it crosses the middle of the screen, and back when the visitor
 * scrolls up. The words are all in the page from the start; under reduced motion they are all ink.
 * `accent` is the one word drawn in the accent colour.
 */
export function WordHighlight({ text, accent, className = "" }: { text: string; accent?: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const words = text.split(" ");
  const [lit, setLit] = useState(words.length);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight;
      // the first word lights when the top reaches 85% of the screen, the last when the bottom reaches 45%
      const start = h * 0.85;
      const end = h * 0.45;
      const progress = Math.min(1, Math.max(0, (start - r.top) / (start - end + r.height)));
      setLit(Math.round(progress * words.length));
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [words.length]);

  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i} className={`transition-colors duration-200 ${i < lit ? (w.replace(/[.,]/g, "") === accent ? "text-accent" : "text-ink") : "text-[#9aa0a8]"}`}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}
