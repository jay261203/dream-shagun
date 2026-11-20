import { NextResponse } from "next/server";

import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

const EXCHANGE_TIMEOUT_MS = 10_000;

/**
 * Google sends the person back here with a one-time code. We swap it for a login session (stored in cookies)
 * and carry on to where they were going. Any failure goes back to the sign-in page with a plain message,
 * and the reason is written to the server log (the message only, never the code).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  console.info(`Sign-in: back from Google, code ${code ? "present" : "MISSING"}, going on to ${next}`);

  if (code) {
    const supabase = await createClient();
    // If Supabase cannot be reached the person would wait for ever; give up after a few seconds instead.
    const result = await Promise.race([
      supabase.auth.exchangeCodeForSession(code),
      new Promise<{ error: Error }>((resolve) =>
        setTimeout(() => resolve({ error: new Error(`no answer from Supabase after ${EXCHANGE_TIMEOUT_MS / 1000} seconds`) }), EXCHANGE_TIMEOUT_MS),
      ),
    ]);
    if (!result.error) {
      console.info("Sign-in: session created");
      return NextResponse.redirect(new URL(next, base));
    }
    console.error("Sign-in: could not swap the code for a session:", result.error.message);
  } else {
    console.error("Sign-in: the return from Google had no code:", url.searchParams.get("error_description") ?? url.searchParams.get("error") ?? "no reason given");
  }
  return NextResponse.redirect(new URL(`/login?error=google&next=${encodeURIComponent(next)}`, base));
}
