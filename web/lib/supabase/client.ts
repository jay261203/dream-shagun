import { createBrowserClient } from "@supabase/ssr";

import { supabaseEnv } from "./env";

/** For code that runs in the browser, such as the "Continue with Google" button. */
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
