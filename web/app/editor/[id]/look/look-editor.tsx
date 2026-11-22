"use client";

import { useState } from "react";

import { SaveStatus } from "@/components/save-status";
import { useAutosave } from "@/lib/use-autosave";

type Props = {
  weddingId: string;
  colors: { key: string; name: string; swatch: string[] }[];
  fonts: { key: string; name: string; heading: string; body: string }[];
  hasMusic: boolean;
  initial: { color: string; font: string; music: boolean };
};

/** Colour, font and music. Each choice saves at once and the preview redraws. */
export function LookEditor({ weddingId, colors, fonts, hasMusic, initial }: Props) {
  const [color, setColor] = useState(initial.color);
  const [font, setFont] = useState(initial.font);
  const [music, setMusic] = useState(initial.music);
  const { save, state, savedAt, message } = useAutosave(weddingId, 150);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Look and music</h1>
        <p className="text-base text-muted">Pick what feels like the two of you. The preview changes as you choose.</p>
      </div>
      <SaveStatus state={state} savedAt={savedAt} message={message} />

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Colours</legend>
        <div className="flex flex-wrap gap-3">
          {colors.map((c) => (
            <label key={c.key} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 ${color === c.key ? "border-ink ring-2 ring-ink" : "border-line hover:bg-surface"}`}>
              <input type="radio" name="color" value={c.key} checked={color === c.key} onChange={() => { setColor(c.key); save({ color_preset: c.key }); }} className="sr-only" />
              <span className="flex" aria-hidden="true">
                {c.swatch.map((hex, i) => (
                  <span key={i} className="-ml-1.5 size-6 rounded-full border border-white first:ml-0" style={{ background: hex }} />
                ))}
              </span>
              <span className="font-semibold">{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-lg font-bold">Fonts</legend>
        <div className="flex flex-wrap gap-3">
          {fonts.map((f) => (
            <label key={f.key} className={`flex min-h-12 min-w-44 cursor-pointer flex-col gap-0.5 rounded-2xl border px-4 py-3 ${font === f.key ? "border-ink ring-2 ring-ink" : "border-line hover:bg-surface"}`}>
              <input type="radio" name="font" value={f.key} checked={font === f.key} onChange={() => { setFont(f.key); save({ font_pair: f.key }); }} className="sr-only" />
              <span className="font-semibold">{f.name}</span>
              <span className="text-sm text-muted">{f.heading.split(",")[0].replace(/'/g, "")} and {f.body.split(",")[0].replace(/'/g, "")}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {hasMusic ? (
        <div className="rounded-[20px] border border-line p-5">
          <label className="flex cursor-pointer items-start justify-between gap-4">
            <span className="flex flex-col gap-1">
              <span className="text-lg font-bold">Music</span>
              <span className="text-[15px] text-muted">A soft tune guests can tap to play. It never starts by itself and stops when they leave the page.</span>
            </span>
            <input type="checkbox" role="switch" checked={music} onChange={(e) => { setMusic(e.target.checked); save({ music_enabled: e.target.checked }); }} className="mt-1 size-6 shrink-0 accent-accent" />
          </label>
        </div>
      ) : null}
    </div>
  );
}
