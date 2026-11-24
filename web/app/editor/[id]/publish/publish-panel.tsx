"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { publishError, type CheckItem } from "@/lib/publish";

type Props = {
  weddingId: string;
  initialStatus: "draft" | "published";
  url: string;
  draftUrl: string;
  qr: string;
  whatsapp: string;
  message: string;
  items: CheckItem[];
};

const button = "inline-flex min-h-12 items-center justify-center rounded-xl px-6 text-base font-bold";

export function PublishPanel({ weddingId, initialStatus, url, draftUrl, qr, whatsapp, message, items }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);
  const ready = items.every((i) => i.ok);

  async function change(action: "publish" | "unpublish") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/weddings/${weddingId}/${action}`, { method: "POST" });
      if (!res.ok) {
        setError(res.status === 401 ? "Your sign-in has expired. Sign in again to continue." : publishError(await res.json().catch(() => null)));
        return;
      }
      setStatus(action === "publish" ? "published" : "draft");
      setConfirmOff(false);
      router.refresh();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
      setError("Your browser would not copy it. Select the link and copy it by hand.");
    }
  }

  const live = status === "published";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">{live ? "Your invitation is live" : "Publish"}</h1>
        <p className="text-base text-muted">{live ? "Anyone with the link can open it. Guests need nothing to sign in to." : "Until you publish, guests who open the link see \"not found\"."}</p>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-danger px-4 py-3 text-[15px] font-semibold text-danger">{error}</p> : null}

      {live ? (
        <>
          <section className="flex flex-col gap-4 rounded-[20px] border border-line p-6" aria-labelledby="share">
            <h2 id="share" className="text-xl font-bold">Share it</h2>
            <p className="break-all rounded-xl bg-surface px-4 py-3 font-semibold">{url}</p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => copy(url, "link")} className={`${button} border border-ink hover:bg-surface`}>
                {copied === "link" ? "Link copied" : "Copy link"}
              </button>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={`${button} bg-accent text-white hover:bg-accent-dark`}>
                Send on WhatsApp
              </a>
              <a href={url} target="_blank" rel="noopener noreferrer" className={`${button} border border-ink hover:bg-surface`}>
                Open the invitation
              </a>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold uppercase tracking-wide text-muted">The message</p>
              <p className="rounded-xl border border-line px-4 py-3 text-[15px]">{message}</p>
              <button type="button" onClick={() => copy(message, "message")} className="inline-flex min-h-11 items-center self-start text-[15px] font-bold text-accent underline">
                {copied === "message" ? "Message copied" : "Copy the message"}
              </button>
            </div>
          </section>

          <section className="flex flex-col items-start gap-3 rounded-[20px] border border-line p-6" aria-labelledby="qr">
            <h2 id="qr" className="text-xl font-bold">QR code</h2>
            <p className="text-[15px] text-muted">For a printed card or a board at the venue. Phones open the invitation when they scan it.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code for ${url}`} width={192} height={192} className="rounded-xl border border-line" />
            <a href={qr} download="invitation-qr.png" className="inline-flex min-h-11 items-center text-[15px] font-bold text-accent underline">
              Download the QR code
            </a>
          </section>

          <section className="flex flex-col gap-3 rounded-[20px] border border-line p-6" aria-labelledby="off">
            <h2 id="off" className="text-xl font-bold">Take it offline</h2>
            <p className="text-[15px] text-muted">The link will show &quot;not found&quot; again. Nothing is deleted, and you can publish again any time. Changes you make while it is live show on the link straight away.</p>
            {confirmOff ? (
              <div role="alertdialog" aria-label="Take the invitation offline?" className="flex flex-wrap items-center gap-2.5 rounded-xl bg-surface px-4 py-3">
                <span className="text-[15px] font-semibold">Take it offline?</span>
                <button type="button" onClick={() => change("unpublish")} disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-danger px-5 text-[15px] font-bold text-white disabled:opacity-60">
                  {busy ? "Working..." : "Yes, take it offline"}
                </button>
                <button type="button" onClick={() => setConfirmOff(false)} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-semibold">
                  Keep it live
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmOff(true)} className={`${button} self-start border border-ink hover:bg-surface`}>
                Unpublish
              </button>
            )}
          </section>
        </>
      ) : (
        <>
          <section className="flex flex-col gap-4 rounded-[20px] border border-line p-6" aria-labelledby="ready">
            <h2 id="ready" className="text-xl font-bold">Before you publish</h2>
            <ul className="flex flex-col gap-2">
              {items.map((i) => (
                <li key={i.label} className="flex flex-wrap items-center gap-3 text-base">
                  <span aria-hidden="true" className={`inline-flex size-6 items-center justify-center rounded-full text-sm font-bold ${i.ok ? "bg-[#e7f4ea] text-[#1b4a2a]" : "bg-[#fff3d6] text-[#5e4408]"}`}>
                    {i.ok ? "✓" : "!"}
                  </span>
                  <span className="font-semibold">{i.label}</span>
                  <span className="sr-only">{i.ok ? "is done" : "is missing"}</span>
                  {i.fix ? (
                    <Link href={`/editor/${weddingId}/${i.fix}`} className="font-bold text-accent underline">
                      Add it
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => change("publish")} disabled={busy || !ready} className={`${button} self-start bg-accent text-white hover:bg-accent-dark disabled:opacity-50`}>
              {busy ? "Publishing..." : "Publish invitation"}
            </button>
          </section>

          <section className="flex flex-col gap-3 rounded-[20px] border border-line p-6" aria-labelledby="draft">
            <h2 id="draft" className="text-xl font-bold">Show the draft to the family</h2>
            <p className="text-[15px] text-muted">This private link shows your draft with a &quot;Draft&quot; banner. It works for family members who are signed in. Guests cannot open it.</p>
            <p className="break-all rounded-xl bg-surface px-4 py-3 text-[15px] font-semibold">{draftUrl}</p>
            <div className="flex flex-wrap gap-2.5">
              <button type="button" onClick={() => copy(draftUrl, "draft")} className={`${button} border border-ink hover:bg-surface`}>
                {copied === "draft" ? "Link copied" : "Copy draft link"}
              </button>
              <a href={draftUrl} target="_blank" rel="noopener noreferrer" className={`${button} border border-ink hover:bg-surface`}>
                Open the draft
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
