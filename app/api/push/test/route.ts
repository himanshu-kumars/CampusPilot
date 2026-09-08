import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { sendPush, vapidConfigured, type PushSubscriptionJSON } from "@/lib/push";

/** Send a real test notification to the current user's subscribed browsers. */
export async function POST() {
  if (!supabaseConfigured()) {
    return NextResponse.json({ success: false, error: "Supabase is not configured." }, { status: 503 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json({ success: false, error: "Push is not configured on this deployment." }, { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", user.id);
  const list = (subs ?? []) as unknown as { endpoint: string; p256dh: string; auth: string }[];
  if (list.length === 0) {
    return NextResponse.json({ success: false, error: "No subscribed browsers. Enable reminders first." }, { status: 404 });
  }
  let sent = 0;
  const gone: string[] = [];
  for (const s of list) {
    const res = await sendPush(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } } as PushSubscriptionJSON,
      { title: "CampusPilot test", body: "Reminders are working on this browser.", url: "/dashboard" }
    );
    if (res.ok) sent++;
    else if (res.gone) gone.push(s.endpoint);
  }
  if (gone.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", gone).eq("user_id", user.id);
  }
  return NextResponse.json({ success: true, sent, pruned: gone.length });
}
