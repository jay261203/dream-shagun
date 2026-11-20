import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseEnv } from "./env";

/** For server code: pages, route handlers. Reads and, where allowed, refreshes the login cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // A page cannot write cookies; proxy.ts has already refreshed them for this request.
        }
      },
    },
  });
}

/** The signed-in user's verified claims, or null. Use this, not getSession(), to decide who someone is. */
export async function currentClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}
