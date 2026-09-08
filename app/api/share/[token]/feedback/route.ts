import { NextResponse, type NextRequest } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { feedbackSchema, firstError } from "@/lib/validation";

/**
 * Public mentor feedback on a share report. No login needed — the token IS
 * the auth, checked inside the SECURITY DEFINER RPC (incl. expiry).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 503 });
  }
  const { token } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: firstError(parsed.error) }, { status: 400 });
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_share_feedback", {
    p_token: token,
    p_author: parsed.data.author,
    p_message: parsed.data.message,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid or expired")) {
      return NextResponse.json(
        { success: false, error: "This share link is invalid or has expired." },
        { status: 410 }
      );
    }
    console.error("submit_share_feedback failed", error);
    return NextResponse.json(
      { success: false, error: "Could not save your feedback. Try again." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
