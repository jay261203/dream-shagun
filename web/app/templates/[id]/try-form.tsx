"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { loadDraft, saveDraft } from "@/lib/draft";
import type { TemplateSummary } from "@/lib/templates/list";
import { MAX_NAME_LENGTH, validDate } from "@/lib/templates/preview";
import { SAMPLE_BRIDE, SAMPLE_DATE, SAMPLE_GROOM } from "@/lib/templates/sample";

type Errors = { bride?: string; groom?: string; date?: string };

/** The address of the preview the phone frame shows. Bad or half-typed values are left out; the preview then uses its sample. */
function previewSrc(id: string, v: { bride: string; groom: string; date: string; color: string }): string {
  const q = new URLSearchParams();
  if (v.bride.trim()) q.set("bride", v.bride.trim());
  if (v.groom.trim()) q.set("groom", v.groom.trim());
  if (validDate(v.date)) q.set("date", v.date);
  if (v.color) q.set("color", v.color);
  return `/preview/${encodeURIComponent(id)}?${q.toString()}`;
}

export function TryForm({ template, others }: { template: TemplateSummary; others: TemplateSummary[] }) {
  const router = useRouter();
  const [bride, setBride] = useState(SAMPLE_BRIDE);
  const [groom, setGroom] = useState(SAMPLE_GROOM);
  const [date, setDate] = useState(SAMPLE_DATE);
  const [color, setColor] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const [src, setSrc] = useState(() => previewSrc(template.id, { bride: SAMPLE_BRIDE, groom: SAMPLE_GROOM, date: SAMPLE_DATE, color: "" }));

  // Bring back what this visitor typed last time on this template. Storage only exists in the browser,
  // so this has to wait until after the first render.
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.template_id === template.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser storage, which the server cannot read
      setBride(draft.bride_name);
      setGroom(draft.groom_name);
      setDate(draft.wedding_date);
      setColor(draft.color_preset ?? "");
    }
  }, [template.id]);

  // The phone frame follows the form, a moment after the last keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setSrc(previewSrc(template.id, { bride, groom, date, color })), 350);
    return () => window.clearTimeout(timer);
  }, [template.id, bride, groom, date, color]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!bride.trim()) next.bride = "Enter the bride's name.";
    if (!groom.trim()) next.groom = "Enter the groom's name.";
    if (!validDate(date)) next.date = "Pick the wedding date.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const saved = saveDraft({ template_id: template.id, bride_name: bride.trim(), groom_name: groom.trim(), wedding_date: date, color_preset: color || null });
    setSaveFailed(!saved);
    router.push("/login");
  }

  const fieldClass = "flex flex-col border border-field px-4 py-3 first:rounded-t-2xl last:rounded-b-2xl [&:not(:last-child)]:border-b-0 focus-within:relative focus-within:z-10 focus-within:border-ink";
  const labelClass = "text-xs font-bold uppercase tracking-wide";
  const inputClass = "bg-transparent pt-1 text-lg outline-none";

  return (
    <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16">
      <div className="flex flex-col items-center gap-5 lg:flex-1">
        <div className="h-[560px] w-[290px] overflow-hidden rounded-[44px] border-[9px] border-ink bg-ink shadow-lg sm:h-[680px] sm:w-[340px] sm:rounded-[48px] sm:border-[10px]">
          <iframe key={template.id} src={src} title={`${template.name} invitation, live preview`} sandbox="allow-scripts" className="size-full border-0 bg-white" />
        </div>
        {others.length > 0 ? (
          <div className="flex gap-2.5" aria-label="Other templates">
            {others.map((o) => (
              <Link key={o.id} href={`/templates/${o.id}`} aria-label={`Try ${o.name}`} className="relative size-16 overflow-hidden rounded-[14px] border border-line">
                {o.preview ? <Image src={o.preview} alt="" fill unoptimized sizes="64px" className="object-cover" /> : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <form onSubmit={submit} noValidate className="flex w-full max-w-lg flex-col gap-7 lg:flex-1">
        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-accent">{template.name} template</p>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-[44px]">Try {template.name} with your names</h1>
          <p className="text-lg leading-relaxed text-muted">The preview changes as you type. Nothing is saved until you sign in.</p>
        </div>

        <div>
          <div>
            <label className={fieldClass}>
              <span className={labelClass}>Bride&apos;s name</span>
              <input value={bride} onChange={(e) => setBride(e.target.value)} maxLength={MAX_NAME_LENGTH} autoComplete="off" aria-invalid={errors.bride ? true : undefined} aria-describedby={errors.bride ? "err-bride" : undefined} className={inputClass} />
            </label>
            <label className={fieldClass}>
              <span className={labelClass}>Groom&apos;s name</span>
              <input value={groom} onChange={(e) => setGroom(e.target.value)} maxLength={MAX_NAME_LENGTH} autoComplete="off" aria-invalid={errors.groom ? true : undefined} aria-describedby={errors.groom ? "err-groom" : undefined} className={inputClass} />
            </label>
            <label className={fieldClass}>
              <span className={labelClass}>Wedding date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={errors.date ? true : undefined} aria-describedby={errors.date ? "err-date" : undefined} className={inputClass} />
            </label>
          </div>
          <div aria-live="polite" className="mt-2 flex flex-col gap-1 text-sm font-semibold text-danger">
            {errors.bride ? <p id="err-bride">{errors.bride}</p> : null}
            {errors.groom ? <p id="err-groom">{errors.groom}</p> : null}
            {errors.date ? <p id="err-date">{errors.date}</p> : null}
          </div>
        </div>

        {template.colors.length > 1 ? (
          <div className="flex flex-col gap-2.5">
            <span id="colours-label" className="text-[15px] font-bold">Colours</span>
            <div role="radiogroup" aria-labelledby="colours-label" className="flex gap-3">
              {template.colors.map((c, i) => {
                const selected = (color === "" ? template.colors[0].id : color) === c.id;
                return (
                  <button key={c.id} type="button" role="radio" aria-checked={selected} aria-label={c.name} onClick={() => setColor(i === 0 ? "" : c.id)} style={{ backgroundColor: c.color }} className={`size-11 rounded-full border-[3px] border-white ${selected ? "ring-2 ring-ink" : "ring-1 ring-line"}`} />
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <button type="submit" className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent text-[17px] font-bold text-white transition hover:-translate-y-px hover:bg-accent-dark active:translate-y-px">
            Save and continue
          </button>
          <a href={`/preview/${encodeURIComponent(template.id)}`} target="_blank" rel="noopener" className="inline-flex min-h-14 items-center justify-center rounded-xl border border-ink text-[17px] font-semibold transition hover:bg-surface">
            See the whole invitation
          </a>
          {saveFailed ? <p className="text-center text-sm font-semibold text-danger">This browser would not keep your names, so you may need to type them again after signing in.</p> : null}
          <p className="text-center text-sm text-muted">You sign in with Google next. Your names and date carry over.</p>
        </div>
      </form>
    </div>
  );
}
