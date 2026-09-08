import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendPush, vapidConfigured, type PushSubscriptionJSON } from "@/lib/push";

/**
 * Daily deadline reminders (Vercel Cron → GET).
 *
 * Auth: Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when
 * the CRON_SECRET env var exists. Reads cross-user data with the service-role
 * key (server-only), so RLS stays strict everywhere else.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface SubRow {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_id: string;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ success: false, error: "Cron is not configured." }, { status: 503 });
  }
  const header = req.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!vapidConfigured()) {
    return NextResponse.json({ success: false, error: "Push is not configured." }, { status: 503 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ success: false, error: "Service role is not configured." }, { status: 503 });
  }

  const admin = createServiceClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: subs, error: subsError } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .limit(5000);
  if (subsError) {
    console.error("cron: subscriptions read failed", subsError);
    return NextResponse.json({ success: false, error: "Could not read subscriptions." }, { status: 500 });
  }
  const byUser = new Map<string, SubRow[]>();
  for (const s of (subs ?? []) as SubRow[]) {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  }

  const in24h = new Date(Date.now() + 24 * 3_600_000).toISOString();
  const in3d = new Date(Date.now() + 3 * 86_400_000).toISOString();
  let notified = 0;
  const gone: string[] = [];

  for (const [userId, rows] of byUser) {
    const [{ data: due }, { data: exams }] = await Promise.all([
      admin
        .from("assignments")
        .select("title, deadline")
        .eq("user_id", userId)
        .neq("status", "completed")
        .lt("deadline", in24h)
        .order("deadline", { ascending: true })
        .limit(5),
      admin
        .from("exams")
        .select("exam_date")
        .eq("user_id", userId)
        .lt("exam_date", in3d)
        .order("exam_date", { ascending: true })
        .limit(5),
    ]);
    const items: string[] = [];
    for (const a of (due ?? []) as { title: string }[]) items.push(a.title);
    const examCount = (exams ?? []).length;
    if (items.length === 0 && examCount === 0) continue; // nothing due → no spam

    const parts: string[] = [];
    if (items.length > 0) parts.push(`${items.length} assignment${items.length === 1 ? "" : "s"} due within 24h`);
    if (examCount > 0) parts.push(`${examCount} exam${examCount === 1 ? "" : "s"} within 3 days`);
    const payload = {
      title: "CampusPilot reminders",
      body: `${parts.join(" · ")}${items.length > 0 ? `: ${items.slice(0, 2).join(", ")}${items.length > 2 ? "…" : ""}` : ""}`,
      url: "/dashboard",
    };
    for (const r of rows) {
      const res = await sendPush(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } } as PushSubscriptionJSON,
        payload
      );
      if (res.ok) notified++;
      else if (res.gone) gone.push(r.endpoint);
    }
  }
  if (gone.length > 0) {
    await admin.from("push_subscriptions").delete().in("endpoint", gone);
  }
  return NextResponse.json({ success: true, users: byUser.size, notified, pruned: gone.length });
}
