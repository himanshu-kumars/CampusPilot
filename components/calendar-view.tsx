"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { assignmentState, daysUntil, formatDate } from "@/lib/calculations";
import type { Assignment, Exam } from "@/lib/types";
import { Badge, Card, Icon, cx } from "./ui";

interface DayEvent {
  kind: "assignment" | "exam";
  id: string;
  title: string;
  meta: string;
  href: string;
  urgent: boolean;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CalendarView({
  assignments,
  exams,
  names,
}: {
  assignments: Assignment[];
  exams: Exam[];
  names: Record<string, string>;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(now));

  const events = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const push = (date: Date, ev: DayEvent) => {
      const k = dayKey(date);
      map.set(k, [...(map.get(k) ?? []), ev]);
    };
    for (const a of assignments) {
      const st = assignmentState(a);
      push(new Date(a.deadline), {
        kind: "assignment",
        id: a.id,
        title: a.title,
        meta: `${names[a.subject_id ?? ""] ?? "No subject"} · ${a.priority} priority`,
        href: "/assignments",
        urgent: st === "overdue" || st === "due-today",
      });
    }
    for (const e of exams) {
      const days = daysUntil(e.exam_date);
      push(new Date(e.exam_date), {
        kind: "exam",
        id: e.id,
        title: `${names[e.subject_id ?? ""] ?? "Exam"}`,
        meta: `Preparation ${e.preparation_percent}%`,
        href: `/study-planner?exam=${e.id}`,
        urgent: days >= 0 && days <= 5,
      });
    }
    return map;
  }, [assignments, exams, names]);

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const out: Date[] = [];
    for (let i = 0; i < 42; i++) {
      out.push(new Date(cursor.y, cursor.m, 1 - offset + i));
    }
    return out;
  }, [cursor]);

  const upcoming = useMemo(() => {
    const items: { date: Date; ev: DayEvent }[] = [];
    events.forEach((list, key) => {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y as number, m as number, d as number);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date.getTime() < today.getTime()) return;
      for (const ev of list) items.push({ date, ev });
    });
    return items
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [events]);

  const move = (delta: number) => {
    setCursor((c) => {
      const d = new Date(c.y, c.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const selectedEvents = events.get(selected) ?? [];
  const [sy, sm, sd] = selected.split("-").map(Number);
  const selectedDate = new Date(sy as number, sm as number, sd as number);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {MONTHS[cursor.m]} {cursor.y}
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label="Previous month"
              className="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <Icon name="chevronRight" className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => {
                const t = new Date();
                setCursor({ y: t.getFullYear(), m: t.getMonth() });
                setSelected(dayKey(t));
              }}
              className="cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label="Next month"
              className="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
            >
              <Icon name="chevronRight" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendar">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-xs font-semibold text-muted">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            const k = dayKey(d);
            const inMonth = d.getMonth() === cursor.m;
            const isToday = dayKey(new Date()) === k;
            const isSelected = selected === k;
            const dayEvents = events.get(k) ?? [];
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(k)}
                aria-label={`${formatDate(d.toISOString())}, ${dayEvents.length} events`}
                className={cx(
                  "flex min-h-12 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors sm:min-h-16",
                  isSelected ? "bg-ink text-white" : "hover:bg-slate-50",
                  !inMonth && !isSelected && "opacity-35"
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 items-center justify-center rounded-full text-sm",
                    isToday && !isSelected && "bg-primary font-bold text-white",
                    !isToday && !isSelected && "text-ink",
                    isSelected && "font-bold"
                  )}
                >
                  {d.getDate()}
                </span>
                <span className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className={cx(
                        "h-1.5 w-1.5 rounded-full",
                        ev.urgent ? "bg-danger" : ev.kind === "exam" ? "bg-warning" : "bg-primary",
                        isSelected && "bg-white"
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-line pt-3 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" /> Assignment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" /> Exam
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-danger" /> Urgent
          </span>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <h3 className="text-base font-semibold text-ink">{formatDate(selectedDate.toISOString())}</h3>
          {selectedEvents.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Nothing scheduled. Enjoy the calm.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {selectedEvents.map((ev, i) => (
                <li key={i}>
                  <Link
                    href={ev.href}
                    className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
                  >
                    <span className={cx("h-8 w-1 shrink-0 rounded-full", ev.urgent ? "bg-danger" : ev.kind === "exam" ? "bg-warning" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink">{ev.title}</span>
                      <span className="block text-xs text-muted">{ev.meta}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h3 className="text-base font-semibold text-ink">Coming up</h3>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No upcoming deadlines or exams.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {upcoming.map(({ date, ev }, i) => (
                <li key={`${ev.kind}-${ev.id}-${i}`}>
                  <Link href={ev.href} className="flex items-center gap-3 text-sm transition-colors hover:text-ink">
                    <span className="w-14 shrink-0 text-xs text-muted">
                      {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <Badge tone={ev.kind === "exam" ? "warning" : "info"}>
                      {ev.kind === "exam" ? "Exam" : "Due"}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{ev.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <a
              href="/api/calendar.ics"
              download="campuspilot-calendar.ics"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-50"
            >
              <Icon name="calendar" className="h-4 w-4" />
              Download for Google / Apple Calendar
            </a>
            <p className="mt-2 text-xs text-muted">Exports deadlines and exams as a standard .ics file.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
