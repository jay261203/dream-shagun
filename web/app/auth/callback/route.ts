import { NextResponse } from "next/server";

import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

/**
 * Google sends the person back here with a one-time code. We swap it for a login session (stored in cookies)
 * and carry on to where they were going. Any failure goes back to the sign-in page with a plain message.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, base));
  }
  return NextResponse.redirect(new URL(`/login?error=google&next=${encodeURIComponent(next)}`, base));
}
