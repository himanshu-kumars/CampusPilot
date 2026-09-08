import { NextResponse, type NextRequest } from "next/server";
import { logEvent } from "@/lib/events";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { eventSchema, firstError } from "@/lib/validation";

/** Client-side activity logging (study-task completions, etc.). */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: firstError(parsed.error) }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  }
  await logEvent(supabase, user.id, parsed.data.kind, parsed.data.label);
  return NextResponse.json({ success: true });
}
