import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

/** Full personal data export (JSON). Your data stays portable. */
export async function GET() {
  if (!supabaseConfigured()) {
    return new NextResponse("Supabase is not configured.", { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const tables = [
    "profiles",
    "subjects",
    "assignments",
    "exams",
    "study_plans",
    "notes",
    "practice_sets",
    "viva_sessions",
    "timetable_entries",
    "internships",
    "activity_events",
  ] as const;
  const out: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    app: "CampusPilot",
  };
  for (const t of tables) {
    const key = t === "profiles" ? "id" : "user_id";
    const { data } = await supabase.from(t).select("*").eq(key, user.id).limit(2000);
    out[t] = data ?? [];
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="campuspilot-export.json"',
    },
  });
}
