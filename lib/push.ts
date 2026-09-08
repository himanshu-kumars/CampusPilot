import webpush from "web-push";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export function vapidConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );
}

let initialized = false;
function ensureVapid(): void {
  if (initialized) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:hello@campuspilot.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string
  );
  initialized = true;
}

export async function sendPush(
  sub: PushSubscriptionJSON,
  payload: PushPayload
): Promise<{ ok: boolean; gone?: boolean; error?: string }> {
  if (!vapidConfigured()) return { ok: false, error: "Push is not configured." };
  ensureVapid();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys } as webpush.PushSubscription,
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    return { ok: false, error: e instanceof Error ? e.message : "Push delivery failed." };
  }
}
