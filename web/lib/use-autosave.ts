"use client";

import { useEffect, useRef, useState } from "react";

import { notifyPreview } from "@/lib/preview-bus";
import { parseSaveError, type SaveState } from "@/lib/wedding-settings";

/**
 * Save changes to the wedding details by themselves. `save(changes)` waits `delay` ms after the last change, so typing
 * does not send a request per letter. Changes made while a save is running are sent right after it, in order,
 * and the newest value always wins. Tells the preview to redraw after each good save.
 */
export function useAutosave(weddingId: string, delay = 600) {
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pending = useRef<Record<string, unknown>>({});
  const timer = useRef<number | null>(null);
  const running = useRef(false);

  async function flush(): Promise<void> {
    if (running.current) return;
    const changes = pending.current;
    if (Object.keys(changes).length === 0) return;
    pending.current = {};
    running.current = true;
    setState("saving");
    try {
      const res = await fetch(`/api/weddings/${weddingId}/details`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(changes) });
      if (!res.ok) {
        setMessage(res.status === 401 ? "Your sign-in has expired. Sign in again to keep saving." : parseSaveError(await res.json().catch(() => null)));
        setState("error");
        return;
      }
      setSavedAt(Date.now());
      setMessage(null);
      setState("saved");
      notifyPreview();
    } catch {
      // Put the changes back so the next attempt sends them.
      pending.current = { ...changes, ...pending.current };
      setMessage("We could not reach the server. Your changes will be sent when you edit again.");
      setState("error");
    } finally {
      running.current = false;
      if (Object.keys(pending.current).length > 0) void flush();
    }
  }

  function save(changes: Record<string, unknown>): void {
    pending.current = { ...pending.current, ...changes };
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), delay);
  }

  // Leaving the page with something waiting sends it now rather than losing it.
  useEffect(() => {
    const send = () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
      if (Object.keys(pending.current).length > 0 && !running.current) {
        void fetch(`/api/weddings/${weddingId}/details`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(pending.current), keepalive: true });
        pending.current = {};
      }
    };
    window.addEventListener("pagehide", send);
    return () => {
      window.removeEventListener("pagehide", send);
      send();
    };
  }, [weddingId]);

  return { save, state, savedAt, message };
}
