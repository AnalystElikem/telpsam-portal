import type { SupabaseClient } from "@supabase/supabase-js";

// Records a coordinator action. Best-effort: never blocks or breaks the action.
export async function logAudit(
  supabase: SupabaseClient,
  actorId: string,
  action: string,
  opts: { targetType?: string; targetId?: string | null; detail?: string } = {}
): Promise<void> {
  try {
    await supabase.from("audit_log").insert({
      actor_id: actorId,
      action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      detail: opts.detail ?? null,
    });
  } catch {
    // Auditing must not interrupt the underlying action.
  }
}
