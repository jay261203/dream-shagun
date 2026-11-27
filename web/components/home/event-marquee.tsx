"use client";

import { useState } from "react";

/**
 * A slow row of event names under the steps. It pauses on hover and with its button (it runs longer than 5 seconds),
 * and under reduced motion it is a still, wrapped row.
 */
export function EventMarquee({ names }: { names: readonly string[] }) {
  const [paused, setPaused] = useState(false);
  const row = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center gap-16 pr-16">
      {names.map((n) => (
        <li key={n} className="whitespace-nowrap">
          {n}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="relative mt-12 flex items-center gap-4 text-2xl tracking-tight text-muted sm:text-[28px]">
      <div className="min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] motion-reduce:[mask-image:none]">
        <div
          className="flex w-max hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:flex-wrap"
          style={{ animation: "marquee 40s linear infinite", animationPlayState: paused ? "paused" : "running" }}
        >
          {row(false)}
          <div className="contents motion-reduce:hidden">{row(true)}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-label={paused ? "Play the event names" : "Pause the event names"}
        className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-line bg-paper text-ink hover:bg-surface motion-reduce:hidden"
      >
        <svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" fill="currentColor">
          {paused ? <path d="M4 2l8 5-8 5z" /> : <path d="M3 2h3v10H3zM8 2h3v10H8z" />}
        </svg>
      </button>
    </div>
  );
}
