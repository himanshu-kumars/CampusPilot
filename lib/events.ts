import type { SupabaseClient } from "@supabase/supabase-js";

/** Best-effort activity log. Never throws — analytics must not break features. */
export async function logEvent(
  supabase: SupabaseClient,
  userId: string,
  kind: string,
  label: string
): Promise<void> {
  try {
    await supabase.from("activity_events").insert({ user_id: userId, kind, label });
  } catch (e) {
    console.error("logEvent failed", e);
  }
}
