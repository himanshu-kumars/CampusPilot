import Link from "next/link";
import { Card, Icon } from "@/components/ui";

/** Cached by the service worker and shown when navigation fails offline. Fully static. */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-16">
      <Card className="w-full text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-muted">
          <Icon name="wifiOff" className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">
          CampusPilot needs a connection to reach your data. Check your network and try again —
          nothing you saved is lost.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
        >
          Retry
        </Link>
      </Card>
    </main>
  );
}
