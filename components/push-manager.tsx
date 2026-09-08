"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, FormError, Icon, toast } from "./ui";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "unknown" | "on" | "off";

export function PushManager() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [supported] = useState(
    () => typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window
  );
  const [status, setStatus] = useState<Status>("unknown");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setStatus(sub ? "on" : "off");
    } catch {
      setStatus("off");
    }
    if ("Notification" in window) setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (supported) refresh().catch(() => undefined);
  }, [supported, refresh]);

  if (!vapidKey) {
    return (
      <Card>
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="alert" className="h-5 w-5 text-primary" />
          Push reminders
        </h2>
        <p className="mt-2 text-sm text-muted">
          Push notifications aren&apos;t configured on this deployment — deadline reminders will
          stay in-app only. (Needs a VAPID key pair; see README.)
        </p>
      </Card>
    );
  }

  if (!supported) {
    return (
      <Card>
        <h2 className="text-base font-semibold text-ink">Push reminders</h2>
        <p className="mt-2 text-sm text-muted">
          This browser doesn&apos;t support push notifications. Reminders stay in-app.
        </p>
      </Card>
    );
  }

  const enable = async () => {
    setError(null);
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        setError("Permission was not granted — enable notifications in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      const out = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !out.success) {
        await sub.unsubscribe().catch(() => undefined);
        setError(out.error ?? "Could not enable reminders.");
        return;
      }
      setStatus("on");
      toast("Reminders enabled on this browser.");
    } catch {
      setError("Could not enable reminders. Push needs the production (HTTPS) build — not localhost.");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setError(null);
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const endpoint = sub?.endpoint ?? null;
      await sub?.unsubscribe().catch(() => undefined);
      if (endpoint) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        }).catch(() => undefined);
      }
      setStatus("off");
      toast("Reminders disabled on this browser.");
    } catch {
      setError("Could not disable reminders. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setError(null);
    setTesting(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const out = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !out.success) setError(out.error ?? "Test failed.");
      else toast("Test notification sent — check your system tray.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="alert" className="h-5 w-5 text-primary" />
          Push reminders
        </h2>
        {status !== "unknown" && (
          <Badge tone={status === "on" ? "success" : "neutral"}>
            {status === "on" ? "On" : "Off"}
          </Badge>
        )}
      </div>
      <p className="mt-1 mb-4 text-sm text-muted">
        Daily deadline reminders on this browser. One quiet summary when something is due —
        never spam, and you can switch off anytime.
      </p>
      {permission === "denied" && (
        <p className="mb-3 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-danger ring-1 ring-red-600/20">
          Notifications are blocked for this site in your browser settings.
        </p>
      )}
      <FormError message={error} />
      <div className="flex flex-wrap gap-2">
        {status === "on" ? (
          <>
            <Button variant="secondary" onClick={test} loading={testing}>
              Send test
            </Button>
            <Button variant="secondary" onClick={disable} loading={busy}>
              Turn off
            </Button>
          </>
        ) : (
          <Button onClick={enable} loading={busy}>
            Enable reminders
          </Button>
        )}
      </div>
    </Card>
  );
}
