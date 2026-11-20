"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

/** Starts Google sign-in. Google sends the person back to /auth/callback, which finishes the job. */
export function GoogleButton({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    const { error: failed } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    // On success the browser leaves for Google, so this only runs when something went wrong before that.
    if (failed) {
      setError("We could not start Google sign-in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex min-h-14 items-center justify-center rounded-xl border border-ink bg-white text-[17px] font-bold transition hover:bg-surface disabled:opacity-60"
      >
        {busy ? "Opening Google..." : "Continue with Google"}
      </button>
      {error ? (
        <p role="alert" className="text-center text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}
