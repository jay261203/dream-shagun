"use client";

import { useEffect, useState } from "react";

import { savedLabel, type SaveState } from "@/lib/wedding-settings";

/** "Saving...", "Saved a moment ago" or the reason it failed. Announced politely to screen readers. */
export function SaveStatus({ state, savedAt, message }: { state: SaveState; savedAt: number | null; message?: string | null }) {
  const [now, setNow] = useState(() => savedAt ?? 0);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p aria-live="polite" role={state === "error" ? "alert" : "status"} className={`min-h-6 text-[15px] font-semibold ${state === "error" ? "text-danger" : "text-muted"}`}>
      {state === "saving" ? "Saving..." : state === "error" ? (message ?? "We could not save that.") : state === "saved" ? savedLabel(savedAt, Math.max(now, savedAt ?? 0)) : ""}
    </p>
  );
}
