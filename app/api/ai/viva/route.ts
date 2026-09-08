import { NextResponse, type NextRequest } from "next/server";
import { AINotConfiguredError, AIValidationError, vivaTurn } from "@/lib/ai";
import { logEvent } from "@/lib/events";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { firstError, vivaRequestSchema } from "@/lib/validation";

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
  const parsed = vivaRequestSchema.safeParse(body);
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

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "viva_turn")
    .gt("created_at", hourAgo);
  if ((count ?? 0) >= 60) {
    return NextResponse.json(
      { success: false, error: "You've practiced a lot this hour. Take a short break and come back." },
      { status: 429 }
    );
  }

  try {
    const turn = await vivaTurn(parsed.data);
    await logEvent(supabase, user.id, "viva_turn", `Viva Q${parsed.data.questionNumber} on “${parsed.data.topic.slice(0, 50)}”`);
    return NextResponse.json({ success: true, turn });
  } catch (e) {
    console.error("ai/viva failed", e);
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 503 });
    }
    if (e instanceof AIValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 422 });
    }
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("AI provider error") || message.includes("empty response")) {
      return NextResponse.json(
        { success: false, error: "The AI examiner is unavailable right now. Try again in a bit." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
