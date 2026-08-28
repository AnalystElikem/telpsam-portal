import { createBrowserClient } from "@supabase/ssr";
import { requireEnv } from "@/lib/env";

// Supabase client for use in Client Components (browser). Uses the public anon
// key, which is safe to expose — access is governed by row-level security.
export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
