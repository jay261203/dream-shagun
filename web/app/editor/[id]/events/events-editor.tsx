"use client";

import Link from "next/link";
import { useState } from "react";

import { notifyPreview } from "@/lib/preview-bus";

import { MAX_EVENTS, emptyForm, formFromEvent, isInDateOrder, kindInfo, moveItem, parseApiErrors, sortedByDate, toPayload, whenLabel, type EventForm, type EventItem, type FormErrors } from "@/lib/events";

import { EventFormFields } from "./event-form";

type Props = { weddingId: string; weddingDate: string | null; initialEvents: EventItem[] };
type Editing = { mode: "add" } | { mode: "edit"; id: string } | null;
type Notice = { kind: "ok" | "error"; text: string; signIn?: boolean } | null;

const arrow = (up: boolean) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={up ? "M6 15l6-6 6 6" : "M6 9l6 6 6-6"} />
  </svg>
);

export function EventsEditor({ weddingId, weddingDate, initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [editing, setEditing] = useState<Editing>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [serverErrors, setServerErrors] = useState<FormErrors & { form?: string }>({});

  const base = `/api/weddings/${weddingId}/events`;

  /** Talk to the server. Returns the response, or null (with a message shown) when the network failed. */
  async function call(path: string, method: string, body?: unknown): Promise<Response | null> {
    try {
      return await fetch(path, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      setNotice({ kind: "error", text: "We could not reach the server. Check your connection and try again." });
      return null;
    }
  }

  /** Words for a failure that is not about one field. */
  async function explain(res: Response): Promise<string> {
    if (res.status === 401) return "Your sign-in has expired.";
    if (res.status === 404) return "This wedding or event could not be found. Refresh the page.";
    if (res.status === 403) return "That request was not allowed.";
    const body = await res.json().catch(() => null);
    return parseApiErrors(body).form ?? "We could not save that. Please try again.";
  }

  async function save(form: EventForm) {
    setBusy(true);
    setNotice(null);
    setServerErrors({});
    const target = editing?.mode === "edit" ? `${base}/${editing.id}` : base;
    const res = await call(target, editing?.mode === "edit" ? "PUT" : "POST", toPayload(form));
    setBusy(false);
    if (!res) return;
    if (!res.ok) {
      if (res.status === 422) setServerErrors(parseApiErrors(await res.json().catch(() => null)));
      else setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
      return;
    }
    const saved = (await res.json()) as EventItem;
    setEvents((list) => (editing?.mode === "edit" ? list.map((e) => (e.id === saved.id ? saved : e)) : [...list, saved]));
    setNotice({ kind: "ok", text: editing?.mode === "edit" ? "Changes saved." : "Event added." });
    notifyPreview();
    setEditing(null);
  }

  async function remove(id: string) {
    setBusy(true);
    setNotice(null);
    const res = await call(`${base}/${id}`, "DELETE");
    setBusy(false);
    setConfirming(null);
    if (!res) return;
    if (!res.ok && res.status !== 404) return setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
    setEvents((list) => list.filter((e) => e.id !== id));
    setNotice({ kind: "ok", text: "Event deleted." });
    notifyPreview();
  }

  /** Show the new order straight away; put it back if the server says no. */
  async function reorder(next: EventItem[]) {
    const before = events;
    setEvents(next);
    setNotice(null);
    const res = await call(`${base}/reorder`, "POST", { ids: next.map((e) => e.id) });
    if (!res) return setEvents(before);
    if (!res.ok) {
      setEvents(before);
      return setNotice({ kind: "error", text: await explain(res), signIn: res.status === 401 });
    }
    setEvents((await res.json()) as EventItem[]);
    notifyPreview();
  }

  const startAdd = () => {
    setServerErrors({});
    setConfirming(null);
    setEditing({ mode: "add" });
  };
  const startEdit = (id: string) => {
    setServerErrors({});
    setConfirming(null);
    setEditing({ mode: "edit", id });
  };
  const full = events.length >= MAX_EVENTS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-base text-muted">Guests reply to each one separately.</p>
        </div>
        <button type="button" onClick={startAdd} disabled={full || editing?.mode === "add"} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface disabled:opacity-50">
          Add an event
        </button>
      </div>

      <div aria-live="polite" className="min-h-0">
        {notice ? (
          <p role={notice.kind === "error" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-[15px] font-semibold ${notice.kind === "ok" ? "bg-[#e7f4ea] text-[#1b4a2a]" : "border border-danger text-danger"}`}>
            {notice.text}{" "}
            {notice.signIn ? (
              <Link href={`/login?next=${encodeURIComponent(`/editor/${weddingId}/events`)}`} className="underline">
                Sign in again
              </Link>
            ) : null}
          </p>
        ) : null}
      </div>

      {full ? <p className="text-sm text-muted">A wedding can have up to {MAX_EVENTS} events.</p> : null}

      {editing?.mode === "add" ? (
        <EventFormFields initial={emptyForm(weddingDate)} serverErrors={serverErrors} busy={busy} submitLabel="Add event" onSubmit={save} onCancel={() => setEditing(null)} />
      ) : null}

      {events.length === 0 && editing?.mode !== "add" ? (
        <div className="flex flex-col items-start gap-4 rounded-[20px] border border-line p-7">
          <p className="text-lg text-muted">No events yet. Add the first function, for example the Pheras.</p>
          <button type="button" onClick={startAdd} className="inline-flex min-h-12 items-center rounded-xl bg-accent px-6 font-bold text-white hover:bg-accent-dark">
            Add an event
          </button>
        </div>
      ) : null}

      {events.length > 1 && !isInDateOrder(events) ? (
        <div>
          <button type="button" onClick={() => reorder(sortedByDate(events))} disabled={busy || editing !== null} className="inline-flex min-h-11 items-center text-[15px] font-bold text-accent underline disabled:opacity-50">
            Put in date order
          </button>
        </div>
      ) : null}

      <ol className="flex flex-col gap-4">
        {events.map((event, index) => (
          <li key={event.id}>
            {editing?.mode === "edit" && editing.id === event.id ? (
              <EventFormFields initial={formFromEvent(event)} serverErrors={serverErrors} busy={busy} submitLabel="Save changes" onSubmit={save} onCancel={() => setEditing(null)} />
            ) : (
              <article className="flex flex-col gap-3 rounded-[20px] border border-line p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold tracking-tight">{event.name}</h2>
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-bold">{kindInfo(event.kind).label}</span>
                    </div>
                    <p className="font-semibold">{whenLabel(event)}</p>
                    {event.venue_name ? <p>{event.venue_name}</p> : null}
                    {event.venue_address ? <p className="text-[15px] text-muted">{event.venue_address}</p> : null}
                    {event.dress_code ? <p className="text-[15px] text-muted">Dress code: {event.dress_code}</p> : null}
                    {event.note ? <p className="text-[15px] text-muted">{event.note}</p> : null}
                    {event.map_url ? (
                      <a href={event.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold underline">
                        Check the map link
                      </a>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label={`Move ${event.name} up`} onClick={() => reorder(moveItem(events, index, index - 1))} disabled={index === 0 || busy || editing !== null} className="inline-flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface disabled:opacity-30">
                      {arrow(true)}
                    </button>
                    <button type="button" aria-label={`Move ${event.name} down`} onClick={() => reorder(moveItem(events, index, index + 1))} disabled={index === events.length - 1 || busy || editing !== null} className="inline-flex size-11 items-center justify-center rounded-full border border-line hover:bg-surface disabled:opacity-30">
                      {arrow(false)}
                    </button>
                  </div>
                </div>

                {confirming === event.id ? (
                  <div role="alertdialog" aria-label={`Delete ${event.name}?`} className="flex flex-wrap items-center gap-2.5 rounded-xl bg-surface px-4 py-3">
                    <span className="text-[15px] font-semibold">Delete {event.name}?</span>
                    <button type="button" onClick={() => remove(event.id)} disabled={busy} className="inline-flex min-h-11 items-center rounded-xl bg-danger px-5 text-[15px] font-bold text-white disabled:opacity-60">
                      Yes, delete
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-semibold">
                      Keep it
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(event.id)} disabled={busy || editing !== null} className="inline-flex min-h-11 items-center rounded-xl border border-ink px-5 text-[15px] font-bold hover:bg-surface disabled:opacity-50">
                      Edit
                    </button>
                    <button type="button" onClick={() => setConfirming(event.id)} disabled={busy || editing !== null} className="inline-flex min-h-11 items-center rounded-xl px-4 text-[15px] font-semibold text-danger underline disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                )}
              </article>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
