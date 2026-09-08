"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { dismissAlert } from "@/lib/actions";
import type { Alert } from "@/lib/notifications";
import { Icon, cx } from "./ui";

const DOT = { danger: "bg-danger", warning: "bg-warning", info: "bg-primary" } as const;

export function NotificationBell({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const visible = alerts.filter((a) => !hidden.includes(a.key));

  const dismiss = (key: string) => {
    setHidden((h) => [...h, key]);
    startTransition(async () => {
      await dismissAlert(key);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={visible.length === 0 ? "Notifications" : `${visible.length} notifications`}
        aria-expanded={open}
        className="relative cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
      >
        <Icon name="alert" className="h-5 w-5" />
        {visible.length > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {visible.length > 9 ? "9+" : visible.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="Notifications"
            className="animate-rise absolute top-full right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-xl"
          >
            <p className="px-3 pt-2 pb-1 text-xs font-bold tracking-wider text-muted uppercase">
              Reminders
            </p>
            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                All caught up. Nothing needs attention.
              </p>
            ) : (
              <ul className="space-y-1">
                {visible.map((a) => (
                  <li
                    key={a.key}
                    className="group flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                  >
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[a.severity])} />
                    <Link href={a.href} onClick={() => setOpen(false)} className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{a.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{a.detail}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => dismiss(a.key)}
                      aria-label={`Dismiss: ${a.title}`}
                      className="cursor-pointer rounded-md p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-200 hover:text-ink focus:opacity-100"
                    >
                      <Icon name="x" className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
