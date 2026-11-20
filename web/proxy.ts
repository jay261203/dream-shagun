import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { supabaseEnv } from "@/lib/supabase/env";

/**
 * Keeps the family's login fresh. A login token lasts about an hour; when it has run out this swaps it for a new one
 * and stores the new cookies on the response. Without it people would be signed out in the middle of editing.
 * Guest pages (/w, /t, /preview) are left out: guests never sign in, and those pages should stay fast.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(toSet) {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims() checks the token and refreshes it when needed. Nothing is decided here; pages check for themselves.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|t/|preview/|w/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|html)$).*)"],
};
