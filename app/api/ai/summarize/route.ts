import { NextResponse, type NextRequest } from "next/server";
import { AIValidationError, generateSummary } from "@/lib/ai";
import { logEvent } from "@/lib/events";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { firstError, summarizeRequestSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const parsed = summarizeRequestSchema.safeParse(body);
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

  const { data: note } = await supabase
    .from("notes")
    .select("*")
    .eq("id", parsed.data.noteId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!note) {
    return NextResponse.json({ success: false, error: "Note not found." }, { status: 404 });
  }

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "ai_summary")
    .gt("created_at", hourAgo);
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { success: false, error: "Too many summaries recently. Please wait a little and try again." },
      { status: 429 }
    );
  }

  try {
    const { summary, source } = await generateSummary(
      note.title as string,
      note.content_text as string
    );
    await supabase
      .from("notes")
      .update({ summary, updated_at: new Date().toISOString() })
      .eq("id", note.id);
    await logEvent(supabase, user.id, "ai_summary", `Summarized “${note.title}”`);
    return NextResponse.json({ success: true, summary, source });
  } catch (e) {
    console.error("ai/summarize failed", e);
    if (e instanceof AIValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 422 });
    }
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("AI provider error") || message.includes("empty response")) {
      return NextResponse.json(
        { success: false, error: "The AI service is unavailable right now. Your notes are saved — try again in a bit." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Something went wrong. Your notes are saved; try again." },
      { status: 500 }
    );
  }
}
