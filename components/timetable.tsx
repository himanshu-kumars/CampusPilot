"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  recordClass,
  updateTimetableEntry,
} from "@/lib/actions";
import { attendancePercent } from "@/lib/calculations";
import type { Subject, TimetableEntry } from "@/lib/types";
import { DAYS } from "@/lib/validation";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  Modal,
  Select,
  cx,
  toast,
} from "./ui";

function fmt(t: string): string {
  return t.slice(0, 5);
}

function todayIndex(): number {
  return (new Date().getDay() + 6) % 7; // Monday-first
}

function EntryDialog({
  open,
  onClose,
  subjects,
  initial,
  presetDay,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  initial?: TimetableEntry;
  presetDay?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject_id: initial?.subject_id ?? subjects[0]?.id ?? "",
    day_of_week: String(initial?.day_of_week ?? presetDay ?? 0),
    start_time: initial ? fmt(initial.start_time) : "09:00",
    end_time: initial ? fmt(initial.end_time) : "10:00",
    room: initial?.room ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial
        ? await updateTimetableEntry(initial.id, form)
        : await createTimetableEntry(form);
      if (res.ok) {
        toast(initial ? "Class updated." : "Class added.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit class" : "Add class"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subject" required>
          <Select value={form.subject_id} onChange={set("subject_id")} required>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Day" required>
          <Select value={form.day_of_week} onChange={set("day_of_week")}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts" required>
            <Input type="time" value={form.start_time} onChange={set("start_time")} required />
          </Field>
          <Field label="Ends" required>
            <Input type="time" value={form.end_time} onChange={set("end_time")} required />
          </Field>
        </div>
        <Field label="Room" hint="Optional.">
          <Input value={form.room} onChange={set("room")} placeholder="e.g. LH-2" maxLength={60} />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function MarkButtons({ subject }: { subject: Subject }) {
  const [pending, startTransition] = useTransition();
  const mark = (present: boolean) => {
    startTransition(async () => {
      const res = await recordClass(subject, present);
      if (!res.ok) toast(res.error, "error");
      else toast(present ? "Marked present." : "Marked absent.");
    });
  };
  return (
    <span className="inline-flex gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => mark(true)}
        aria-label={`Mark present for ${subject.name}`}
        className="cursor-pointer rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-success ring-1 ring-emerald-600/20 transition-colors hover:bg-emerald-100 disabled:opacity-60"
      >
        Present
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => mark(false)}
        aria-label={`Mark absent for ${subject.name}`}
        className="cursor-pointer rounded-lg bg-red-50 px-2.5 py-1 text-xs font-semibold text-danger ring-1 ring-red-600/20 transition-colors hover:bg-red-100 disabled:opacity-60"
      >
        Absent
      </button>
    </span>
  );
}

export function TimetableManager({
  entries,
  subjects,
}: {
  entries: TimetableEntry[];
  subjects: Subject[];
}) {
  const [dialog, setDialog] = useState<{ open: boolean; initial?: TimetableEntry; day?: number }>({
    open: false,
  });
  const [deleting, startDelete] = useTransition();
  const names = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const today = todayIndex();

  const byDay = useMemo(() => {
    const map: TimetableEntry[][] = Array.from({ length: 7 }, () => []);
    for (const e of entries) map[e.day_of_week]?.push(e);
    for (const list of map) list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [entries]);

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="clock"
        title="Add a subject first"
        body="Your timetable links weekly classes to subjects, so attendance stays in sync."
      />
    );
  }

  const remove = (id: string) => {
    startDelete(async () => {
      const res = await deleteTimetableEntry(id);
      if (res.ok) toast("Class removed.");
      else toast(res.error, "error");
    });
  };

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => setDialog({ open: true })}>
          <Icon name="plus" className="h-4 w-4" />
          Add class
        </Button>
      </div>
      {entries.length === 0 ? (
        <EmptyState
          icon="clock"
          title="No classes scheduled"
          body="Add your weekly classes once — CampusPilot will show today's lineup on your dashboard."
          action={
            <Button onClick={() => setDialog({ open: true })}>
              <Icon name="plus" className="h-4 w-4" />
              Add your first class
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3">
          {DAYS.map((day, di) => {
            const list = byDay[di] ?? [];
            const isToday = di === today;
            return (
              <Card key={day} className={cx(isToday && "ring-2 ring-primary/60")}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold tracking-wide text-ink uppercase">{day}</h3>
                  <span className="flex items-center gap-2">
                    {isToday && (
                      <Badge tone="info">Today</Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => setDialog({ open: true, day: di })}
                      aria-label={`Add class on ${day}`}
                      className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                    >
                      <Icon name="plus" className="h-4 w-4" />
                    </button>
                  </span>
                </div>
                {list.length === 0 ? (
                  <p className="py-2 text-sm text-muted">No classes.</p>
                ) : (
                  <ul className="space-y-2">
                    {list.map((e) => {
                      const subject = names.get(e.subject_id);
                      return (
                        <li key={e.id} className="rounded-xl border border-line p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">
                                {subject?.name ?? "Unknown subject"}
                              </p>
                              <p className="mt-0.5 text-xs text-muted">
                                {fmt(e.start_time)} – {fmt(e.end_time)}
                                {e.room ? ` · ${e.room}` : ""}
                              </p>
                            </div>
                            <span className="flex shrink-0 items-center">
                              <button
                                type="button"
                                onClick={() => setDialog({ open: true, initial: e })}
                                aria-label="Edit class"
                                className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
                              >
                                <Icon name="pencil" className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={deleting}
                                onClick={() => remove(e.id)}
                                aria-label="Remove class"
                                className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-60"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </button>
                            </span>
                          </div>
                          {isToday && subject && (
                            <div className="mt-2.5 border-t border-line pt-2.5">
                              <MarkButtons subject={subject} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}
      <EntryDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false })}
        subjects={subjects}
        initial={dialog.initial}
        presetDay={dialog.day}
      />
    </div>
  );
}

/** Compact "today's classes" widget for the dashboard. */
export function TodaysClasses({
  entries,
  subjects,
}: {
  entries: TimetableEntry[];
  subjects: Subject[];
}) {
  const names = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const list = useMemo(
    () =>
      entries
        .filter((e) => e.day_of_week === todayIndex())
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    [entries]
  );
  if (list.length === 0) return null;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-ink">Today&apos;s classes</h2>
        <a href="/timetable" className="text-sm font-semibold text-primary hover:underline">
          Timetable
        </a>
      </div>
      <ul className="space-y-2">
        {list.map((e) => {
          const subject = names.get(e.subject_id);
          const pct = subject ? attendancePercent(subject.attended, subject.total) : null;
          return (
            <li
              key={e.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line px-3 py-2.5"
            >
              <span className="w-24 shrink-0 text-xs font-semibold text-muted">
                {fmt(e.start_time)} – {fmt(e.end_time)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">
                  {subject?.name ?? "Unknown"}
                  {e.room ? <span className="font-normal text-muted"> · {e.room}</span> : null}
                </span>
                <span className="block text-xs text-muted">
                  {pct === null ? "No attendance yet" : `${Math.round(pct * 10) / 10}% attendance`}
                </span>
              </span>
              {subject && <MarkButtons subject={subject} />}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
