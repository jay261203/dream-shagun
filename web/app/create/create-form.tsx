"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearDraft, loadDraft } from "@/lib/draft";
import { finalSlug, isValidSlug, suggestSlug, typingSlug } from "@/lib/slug";
import { MAX_NAME_LENGTH, validDate } from "@/lib/templates/preview";
import { brand } from "@/lib/brand";

type Side = "bride" | "groom";
type SlugState = { kind: "idle" } | { kind: "checking" } | { kind: "free" } | { kind: "taken"; suggestions: string[] } | { kind: "invalid" };
type Errors = { bride?: string; groom?: string; date?: string; slug?: string; side?: string; form?: string };

export function CreateForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [bride, setBride] = useState("");
  const [groom, setGroom] = useState("");
  const [date, setDate] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [side, setSide] = useState<Side | "">("");
  // What is typed may end in a dash; what is checked and saved never does.
  const cleanSlug = finalSlug(slug);
  const [slugState, setSlugState] = useState<SlugState>({ kind: "idle" });
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [colorPreset, setColorPreset] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  // What the visitor typed on "Try with your names" comes with them. Browser storage can only be read after the first render.
  useEffect(() => {
    const draft = loadDraft();
    if (!draft) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring browser storage, which the server cannot read
    setBride(draft.bride_name);
    setGroom(draft.groom_name);
    setDate(draft.wedding_date);
    setSlug(suggestSlug(draft.bride_name, draft.groom_name));
    setTemplateId(draft.template_id);
    setColorPreset(draft.color_preset);
  }, []);

  // Ask the server whether the link name is free, a moment after typing stops.
  useEffect(() => {
    if (!cleanSlug) {
      const idle = window.setTimeout(() => setSlugState({ kind: "idle" }), 0);
      return () => window.clearTimeout(idle);
    }
    if (!isValidSlug(cleanSlug)) {
      const bad = window.setTimeout(() => setSlugState({ kind: "invalid" }), 0);
      return () => window.clearTimeout(bad);
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSlugState({ kind: "checking" });
      try {
        const res = await fetch(`/api/weddings/slug-check?slug=${encodeURIComponent(cleanSlug)}`, { signal: controller.signal });
        if (!res.ok) return setSlugState({ kind: "idle" });
        const body = (await res.json()) as { available: boolean; reason?: string; suggestions?: string[] };
        setSlugState(body.available ? { kind: "free" } : body.reason === "invalid" ? { kind: "invalid" } : { kind: "taken", suggestions: body.suggestions ?? [] });
      } catch {
        // Aborted by the next keystroke, or offline: the form still works, the server checks again on submit.
      }
    }, 400);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cleanSlug]);

  function changeNames(nextBride: string, nextGroom: string) {
    setBride(nextBride);
    setGroom(nextGroom);
    if (!slugTouched) setSlug(suggestSlug(nextBride, nextGroom));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (!bride.trim()) next.bride = "Enter the bride's name.";
    if (!groom.trim()) next.groom = "Enter the groom's name.";
    if (!validDate(date)) next.date = "Pick the wedding date.";
    if (!isValidSlug(cleanSlug)) next.slug = "Use 3 or more letters or numbers. Words can be joined with a dash.";
    if (!side) next.side = "Choose your side. Each side keeps its own gifts list.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/weddings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bride_name: bride.trim(),
          groom_name: groom.trim(),
          wedding_date: date,
          slug: cleanSlug,
          side,
          template_id: templateId,
          color_preset: colorPreset,
        }),
      });
      if (res.status === 401) return router.push("/login?next=/create");
      if (res.status === 409) {
        const body = (await res.json()) as { detail?: { suggestions?: string[] } };
        setSlugState({ kind: "taken", suggestions: body.detail?.suggestions ?? [] });
        setErrors({ slug: "That link name was just taken. Pick another." });
        return;
      }
      if (!res.ok) {
        setErrors({ form: res.status === 422 ? "Something in the form was not accepted. Check it and try again." : "We could not create your wedding. Please try again in a moment." });
        return;
      }
      clearDraft();
      router.push(`/dashboard?created=${encodeURIComponent(cleanSlug)}`);
    } catch {
      setErrors({ form: "We could not reach the server. Check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const boxBase = "flex flex-col rounded-2xl border px-4 py-3 focus-within:border-ink";
  const box = `${boxBase} border-field`;
  const label = "text-xs font-bold uppercase tracking-wide";
  const input = "bg-transparent pt-1 text-lg outline-none";
  const err = "text-sm font-semibold text-danger";

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-muted">Step 1 of 2{email ? ` · Signed in as ${email}` : ""}</p>
        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight">Create your wedding</h1>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <label className={`${box} flex-1`}>
            <span className={label}>Bride</span>
            <input value={bride} onChange={(e) => changeNames(e.target.value, groom)} maxLength={MAX_NAME_LENGTH} autoComplete="off" aria-invalid={errors.bride ? true : undefined} aria-describedby={errors.bride ? "e-bride" : undefined} className={input} />
          </label>
          <label className={`${box} flex-1`}>
            <span className={label}>Groom</span>
            <input value={groom} onChange={(e) => changeNames(bride, e.target.value)} maxLength={MAX_NAME_LENGTH} autoComplete="off" aria-invalid={errors.groom ? true : undefined} aria-describedby={errors.groom ? "e-groom" : undefined} className={input} />
          </label>
        </div>
        {errors.bride ? <p id="e-bride" className={err}>{errors.bride}</p> : null}
        {errors.groom ? <p id="e-groom" className={err}>{errors.groom}</p> : null}

        <label className={box}>
          <span className={label}>Wedding date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-invalid={errors.date ? true : undefined} aria-describedby={errors.date ? "e-date" : undefined} className={input} />
        </label>
        {errors.date ? <p id="e-date" className={err}>{errors.date}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <label className={`${boxBase} ${slugState.kind === "taken" || errors.slug ? "border-danger" : "border-field"}`}>
          <span className={label}>Your invitation link</span>
          <span className="flex items-baseline pt-1">
            <span className="whitespace-nowrap text-[15px] text-muted">{brand.domain}/w/</span>
            <input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(typingSlug(e.target.value));
              }}
              autoComplete="off"
              spellCheck={false}
              aria-describedby="slug-help"
              aria-invalid={slugState.kind === "taken" || slugState.kind === "invalid" || errors.slug ? true : undefined}
              className="min-w-0 flex-1 bg-transparent text-lg outline-none"
            />
          </span>
        </label>
        <div id="slug-help" aria-live="polite" className="flex flex-col gap-2 text-sm">
          {slugState.kind === "checking" ? <p className="text-muted">Checking...</p> : null}
          {slugState.kind === "free" ? <p className="font-semibold text-[#1f7a3f]">That link name is free.</p> : null}
          {slugState.kind === "invalid" ? <p className="text-muted">Use 3 or more letters or numbers. Words can be joined with a dash.</p> : null}
          {slugState.kind === "taken" ? (
            <>
              <p className={err}>That link name is taken.{slugState.suggestions.length > 0 ? " Try one of these:" : " Try another."}</p>
              {slugState.suggestions.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {slugState.suggestions.map((s) => (
                    <button key={s} type="button" onClick={() => { setSlugTouched(true); setSlug(s); }} className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-[15px] font-medium hover:bg-surface">
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
          {errors.slug && slugState.kind !== "taken" ? <p className={err}>{errors.slug}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span id="side-label" className="text-[15px] font-bold">Which side are you on?</span>
        <div role="radiogroup" aria-labelledby="side-label" className="flex gap-2.5">
          {(["bride", "groom"] as const).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={side === s} onClick={() => setSide(s)} className={`inline-flex min-h-[52px] flex-1 items-center justify-center rounded-xl text-base ${side === s ? "border-2 border-ink bg-surface font-bold" : "border border-line font-medium"}`}>
              {s === "bride" ? "Bride's side" : "Groom's side"}
            </button>
          ))}
        </div>
        <p className="text-[13px] leading-snug text-muted">Each side keeps its own UPI ID and its own gifts list.</p>
        {errors.side ? <p className={err}>{errors.side}</p> : null}
      </div>

      <div className="flex flex-col gap-2.5">
        {errors.form ? <p role="alert" className={`${err} text-center`}>{errors.form}</p> : null}
        <button type="submit" disabled={submitting} className="inline-flex min-h-14 items-center justify-center rounded-xl bg-accent text-[17px] font-bold text-white transition hover:-translate-y-px hover:bg-accent-dark active:translate-y-px disabled:opacity-60">
          {submitting ? "Creating..." : "Create and start editing"}
        </button>
        <p className="text-center text-[13px] text-muted">You can add a cover photo and your story in the editor.</p>
      </div>
    </form>
  );
}
