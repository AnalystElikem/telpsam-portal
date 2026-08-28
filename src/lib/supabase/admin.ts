import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";

// Privileged, SERVER-ONLY client using the service_role key. It bypasses
// row-level security, so only use it in trusted server code (admin actions,
// approvals, assigning mentors). Never import this into a Client Component.
export function createAdminClient() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
