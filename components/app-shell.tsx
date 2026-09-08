"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/lib/actions";
import type { Alert } from "@/lib/notifications";
import { NotificationBell } from "./notification-bell";
import { Icon, Toaster, cx, type IconName } from "./ui";

const NAV: { href: string; label: string; short: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Dashboard", short: "Home", icon: "grid" },
  { href: "/attendance", label: "Attendance", short: "Attend.", icon: "target" },
  { href: "/assignments", label: "Assignments", short: "Tasks", icon: "tasks" },
  { href: "/exams", label: "Exams", short: "Exams", icon: "calendar" },
  { href: "/study-planner", label: "Study Planner", short: "Planner", icon: "spark" },
  { href: "/notes", label: "Notes", short: "Notes", icon: "book" },
  { href: "/practice", label: "Practice", short: "Quiz", icon: "checkCircle" },
  { href: "/viva", label: "Viva Practice", short: "Viva", icon: "chat" },
  { href: "/calendar", label: "Calendar", short: "Cal.", icon: "calendar" },
  { href: "/timetable", label: "Timetable", short: "Table", icon: "clock" },
  { href: "/groups", label: "Study Groups", short: "Groups", icon: "users" },
  { href: "/internships", label: "Internships", short: "Jobs", icon: "briefcase" },
  { href: "/placement", label: "Placement Prep", short: "Place.", icon: "cap" },
  { href: "/analytics", label: "Analytics", short: "Stats", icon: "chart" },
];

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
        <Icon name="compass" className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-ink">CampusPilot</span>
    </Link>
  );
}

export function AppShell({
  displayName,
  userEmail,
  alerts,
  children,
}: {
  displayName: string;
  userEmail: string | null;
  alerts: Alert[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex items-center justify-between px-4 pt-5 pl-6">
          <Brand />
          <NotificationBell alerts={alerts} />
        </div>
        <nav aria-label="Primary" className="mt-8 flex-1 space-y-1 px-3">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-indigo-50 text-primary" : "text-muted hover:bg-slate-50 hover:text-ink"
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-line p-3">
          <Link
            href="/settings"
            className={cx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/settings" ? "bg-indigo-50 text-primary" : "text-muted hover:bg-slate-50 hover:text-ink"
            )}
          >
            <Icon name="settings" className="h-5 w-5" />
            Settings
          </Link>
          {userEmail && (
            <form action={signOut}>
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-slate-50 hover:text-ink"
              >
                <Icon name="logout" className="h-5 w-5" />
                Log out
              </button>
            </form>
          )}
          <p className="truncate px-3 pt-2 pb-1 text-xs text-muted" title={userEmail ?? undefined}>
            {displayName}
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Brand />
          <div className="flex items-center gap-1">
            <NotificationBell alerts={alerts} />
            <Link
              href="/settings"
              aria-label="Settings"
              className="rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <Icon name="settings" className="h-5 w-5" />
            </Link>
            {userEmail && (
              <form action={signOut}>
                <button
                  type="submit"
                  aria-label="Log out"
                  className="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                >
                  <Icon name="logout" className="h-5 w-5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="lg:pl-64">
        <main className="mx-auto max-w-6xl px-4 py-6 pb-28 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
      >
        <div className="flex gap-0.5 overflow-x-auto px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-w-14 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium whitespace-nowrap transition-colors",
                  active ? "text-primary" : "text-muted hover:text-ink"
                )}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.short}
              </Link>
            );
          })}
        </div>
      </nav>

      <Toaster />
    </div>
  );
}
