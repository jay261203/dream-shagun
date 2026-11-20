import { NextResponse } from "next/server";

import { isSameOrigin } from "@/lib/api-bridge";
import { createClient } from "@/lib/supabase/server";

/** Sign out, then go to the home page. POST only, so a link someone else posts cannot sign you out. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response("Not allowed", { status: 403 });

  const supabase = await createClient();
  await supabase.auth.signOut();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  // 303 so the browser follows with a GET, not another POST.
  return NextResponse.redirect(new URL("/", base), 303);
}
