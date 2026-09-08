import { NextResponse, type NextRequest } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { firstError, pushSubscriptionSchema } from "@/lib/validation";
import { vapidConfigured } from "@/lib/push";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

/** Save (or refresh) this browser's push subscription. */
export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 503 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json({ success: false, error: "Push is not configured on this deployment." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: firstError(parsed.error) }, { status: 400 });
  }
  const ctx = await currentUserId();
  if (!ctx) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  const { error } = await ctx.supabase.from("push_subscriptions").upsert(
    {
      user_id: ctx.userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) {
    console.error("push subscribe failed", error);
    return NextResponse.json({ success: false, error: "Could not save the subscription." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

/** Remove this browser's push subscription. */
export async function DELETE(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 503 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length === 0) {
    return NextResponse.json({ success: false, error: "endpoint is required." }, { status: 400 });
  }
  const ctx = await currentUserId();
  if (!ctx) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  const { error } = await ctx.supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", ctx.userId);
  if (error) {
    console.error("push unsubscribe failed", error);
    return NextResponse.json({ success: false, error: "Could not remove the subscription." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
