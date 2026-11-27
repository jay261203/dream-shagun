"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Piece = { src?: string; alt?: string; card?: [string, string]; left: string; top: string; width: string; height?: string };

/** Three sets of real screens from the product, each a few pieces, one shown at a time. */
const SETS: Piece[][] = [
  [
    { src: "/home/inv-marigold-cover.png", left: "4%", top: "4%", width: "44%", height: "92%" },
    { src: "/home/inv-rose-events.png", left: "52%", top: "18%", width: "44%", height: "78%" },
    { card: ["Sangeet", "26 coming, 2 maybe"], left: "52%", top: "4%", width: "44%" },
  ],
  [
    { src: "/home/inv-forest-reply.png", left: "4%", top: "12%", width: "44%", height: "84%" },
    { src: "/home/inv-rose-cover.png", left: "52%", top: "4%", width: "44%", height: "66%" },
    { card: ["Rohan", "Pheras: maybe"], left: "52%", top: "76%", width: "44%" },
  ],
  [
    { src: "/home/host-replies.png", left: "4%", top: "4%", width: "44%", height: "92%" },
    { src: "/home/inv-forest-story.png", left: "52%", top: "12%", width: "44%", height: "84%" },
  ],
];

const EVERY_MS = 2800;

/**
 * The hero's collage: the invitation in its three colourways, a reply form and the hosts' counts. The sets change every
 * 2.8 seconds and stop while the pointer is on them; under reduced motion the first set stays.
 */
export function HeroCollage() {
  const [on, setOn] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setOn((i) => (i + 1) % SETS.length), EVERY_MS);
    return () => window.clearInterval(timer);
  }, [held]);

  return (
    <div
      role="img"
      aria-label="Meera and Dev's invitation in the Marigold, Rose and Forest colours: the cover, the events, the reply form and the count of guests coming"
      className="relative h-[440px] w-full sm:h-[560px] lg:h-full lg:min-h-[560px]"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {SETS.map((set, i) => (
        <div key={i} aria-hidden="true" className={`absolute inset-0 transition-opacity duration-700 ${i === on ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          {set.map((p, k) =>
            p.src ? (
              <div key={k} className="absolute overflow-hidden rounded-2xl bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_rgb(29_37_48/0.10)]" style={{ left: p.left, top: p.top, width: p.width, height: p.height }}>
                <Image src={p.src} alt="" fill unoptimized priority={i === 0} sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover object-top" />
              </div>
            ) : (
              <div key={k} className="absolute grid gap-0.5 rounded-xl border border-line bg-paper px-3.5 py-3 text-sm shadow-[0_8px_24px_rgb(29_37_48/0.10)]" style={{ left: p.left, top: p.top, width: p.width }}>
                <b className="font-medium">{p.card?.[0]}</b>
                <span>{p.card?.[1]}</span>
              </div>
            ),
          )}
        </div>
      ))}
    </div>
  );
}
