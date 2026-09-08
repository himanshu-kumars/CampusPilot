"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  createAssignment,
  createExam,
  createSubject,
  deleteAssignment,
  deleteExam,
  deleteSubject,
  recordClass,
  setAssignmentStatus,
  updateAssignment,
  updateExam,
  updateProfile,
  updateSubject,
} from "@/lib/actions";
import {
  assignmentState,
  attendancePercent,
  attendanceStatus,
  classesNeeded,
  daysUntil,
  formatDate,
  formatDateTime,
  sortAssignments,
  toDateValue,
  toDatetimeLocalValue,
  type AssignmentState,
} from "@/lib/calculations";
import type {
  Assignment,
  AssignmentPriority,
  AssignmentStatus,
  Exam,
  Profile,
  Subject,
} from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  Modal,
  ProgressBar,
  Select,
  Textarea,
  cx,
  toast,
} from "./ui";

/* ------------------------------ Confirm delete ----------------------------- */

function ConfirmDelete({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={label}
        title={label}
        className="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-red-50 hover:text-danger"
      >
        <Icon name="trash" className="h-4.5 w-4.5" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted">Sure?</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await onDelete();
            if (res.ok) toast("Deleted.");
            else toast(res.error, "error");
            setConfirming(false);
          })
        }
        className="cursor-pointer rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-slate-100"
      >
        No
      </button>
    </span>
  );
}

function EditButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="cursor-pointer rounded-lg p-2 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
    >
      <Icon name="pencil" className="h-4.5 w-4.5" />
    </button>
  );
}

/* --------------------------------- Subjects -------------------------------- */

function SubjectDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Subject;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    attended: String(initial?.attended ?? 0),
    total: String(initial?.total ?? 0),
    target_attendance: String(initial?.target_attendance ?? 75),
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
        ? await updateSubject(initial.id, form)
        : await createSubject(form);
      if (res.ok) {
        toast(initial ? "Subject updated." : "Subject added.");
        onClose();
      } else {
        setError(res.error); // keep dialog open, preserve input
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit subject" : "Add subject"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Subject name" required>
          <Input value={form.name} onChange={set("name")} placeholder="e.g. Digital Electronics" maxLength={80} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Classes attended" required>
            <Input type="number" min={0} step={1} value={form.attended} onChange={set("attended")} required />
          </Field>
          <Field label="Total classes" required>
            <Input type="number" min={0} step={1} value={form.total} onChange={set("total")} required />
          </Field>
        </div>
        <Field label="Attendance target (%)" hint="Usually 75%. Used only for your own tracking.">
          <Input type="number" min={1} max={100} step={1} value={form.target_attendance} onChange={set("target_attendance")} />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add subject"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function SubjectDialogButton({ label = "Add subject" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <SubjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const STATUS_META = {
  healthy: { label: "Healthy", tone: "success", icon: "checkCircle" },
  watch: { label: "Watch", tone: "warning", icon: "clock" },
  critical: { label: "Critical", tone: "danger", icon: "alert" },
  none: { label: "No data", tone: "neutral", icon: "target" },
} as const;

function SubjectCard({ subject }: { subject: Subject }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const percent = attendancePercent(subject.attended, subject.total);
  const status = attendanceStatus(percent, subject.target_attendance);
  const meta = STATUS_META[status];
  const need = classesNeeded(subject.attended, subject.total, subject.target_attendance);

  const mark = (present: boolean) => {
    startTransition(async () => {
      const res = await recordClass(subject, present);
      if (!res.ok) toast(res.error, "error");
    });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{subject.name}</h3>
          <p className="mt-0.5 text-sm text-muted">
            {percent === null ? (
              "No classes recorded yet"
            ) : (
              <>
                Attended: {subject.attended} / {subject.total} · Target: {subject.target_attendance}%
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <EditButton onClick={() => setEditOpen(true)} label={`Edit ${subject.name}`} />
          <ConfirmDelete label={`Delete ${subject.name}`} onDelete={() => deleteSubject(subject.id)} />
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold tracking-tight text-ink">
          {percent === null ? "—" : `${Math.round(percent * 10) / 10}%`}
        </p>
        <Badge tone={meta.tone} icon={meta.icon}>
          {meta.label}
        </Badge>
      </div>
      <div className="mt-2">
        <ProgressBar
          value={percent}
          tone={status === "healthy" ? "success" : status === "watch" ? "warning" : status === "critical" ? "danger" : "neutral"}
          label={
            percent === null
              ? "Record classes to start tracking."
              : need === 0
                ? "Target reached — keep it up."
                : need === null
                  ? "A 100% target needs a perfect record."
                  : `Attend the next ${need} in a row to reach ${subject.target_attendance}%.`
          }
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => mark(true)}>
          <Icon name="check" className="h-4 w-4" />
          Present
        </Button>
        <Button variant="secondary" size="sm" disabled={pending} onClick={() => mark(false)}>
          <Icon name="x" className="h-4 w-4" />
          Absent
        </Button>
      </div>

      <SubjectDialog open={editOpen} onClose={() => setEditOpen(false)} initial={subject} />
    </Card>
  );
}

export function SubjectGrid({ subjects }: { subjects: Subject[] }) {
  if (subjects.length === 0) {
    return (
      <EmptyState
        icon="target"
        title="No subjects yet"
        body="Add your first subject to start tracking attendance."
        action={<SubjectDialogButton />}
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {subjects.map((s) => (
        <SubjectCard key={s.id} subject={s} />
      ))}
    </div>
  );
}

/* -------------------------------- Assignments ------------------------------ */

const PRIORITY_META: Record<AssignmentPriority, { label: string; tone: "danger" | "warning" | "neutral" }> = {
  high: { label: "High", tone: "danger" },
  medium: { label: "Medium", tone: "warning" },
  low: { label: "Low", tone: "neutral" },
};

const STATE_META: Record<AssignmentState, { label: string; tone: "success" | "danger" | "warning" | "info" | "neutral" }> = {
  completed: { label: "Completed", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  "due-today": { label: "Due today", tone: "warning" },
  "due-soon": { label: "Due soon", tone: "info" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

const STATUS_LABEL: Record<AssignmentStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

function nextStatus(s: AssignmentStatus): AssignmentStatus {
  return s === "pending" ? "in_progress" : s === "in_progress" ? "completed" : "pending";
}

function AssignmentDialog({
  open,
  onClose,
  subjects,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  initial?: Assignment;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    subject_id: initial?.subject_id ?? "",
    deadline: initial ? toDatetimeLocalValue(initial.deadline) : "",
    priority: (initial?.priority ?? "medium") as AssignmentPriority,
    status: (initial?.status ?? "pending") as AssignmentStatus,
    description: initial?.description ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial
        ? await updateAssignment(initial.id, form)
        : await createAssignment(form);
      if (res.ok) {
        toast(initial ? "Assignment updated." : "Assignment added.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit assignment" : "Add assignment"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" required>
          <Input value={form.title} onChange={set("title")} placeholder="e.g. Mathematics Assignment" maxLength={120} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Subject">
            <Select value={form.subject_id} onChange={set("subject_id")}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline" required>
            <Input type="datetime-local" value={form.deadline} onChange={set("deadline")} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Priority">
            <Select value={form.priority} onChange={set("priority")}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.description} onChange={set("description")} placeholder="Anything worth remembering…" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add assignment"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AssignmentDialogButton({
  subjects,
  label = "Add assignment",
}: {
  subjects: Subject[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <AssignmentDialog open={open} onClose={() => setOpen(false)} subjects={subjects} />
    </>
  );
}

function AssignmentCard({
  assignment,
  subjectName,
  subjects,
}: {
  assignment: Assignment;
  subjectName: string | null;
  subjects: Subject[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const state = assignmentState(assignment);
  const stateMeta = STATE_META[state];
  const priorityMeta = PRIORITY_META[assignment.priority];
  const done = assignment.status === "completed";

  const advance = () => {
    startTransition(async () => {
      const res = await setAssignmentStatus(assignment, nextStatus(assignment.status));
      if (res.ok) {
        if (nextStatus(assignment.status) === "completed") toast("Assignment marked complete.");
      } else toast(res.error, "error");
    });
  };

  return (
    <Card className={cx(done && "opacity-75")}>
      <div className="flex items-start gap-3">
        <Checkbox
          aria-label={done ? `Reopen ${assignment.title}` : `Mark ${assignment.title} complete`}
          checked={done}
          disabled={pending}
          onChange={advance}
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <h3 className={cx("text-base font-semibold text-ink", done && "line-through")}>
            {assignment.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted">
            {subjectName ?? "No subject"} · Due {formatDateTime(assignment.deadline)}
          </p>
          {assignment.description && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">{assignment.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone={stateMeta.tone}>{stateMeta.label}</Badge>
            <Badge tone={priorityMeta.tone}>{priorityMeta.label} priority</Badge>
            <Badge tone="neutral">{STATUS_LABEL[assignment.status]}</Badge>
          </div>
        </div>
        <div className="flex shrink-0 items-center">
          <EditButton onClick={() => setEditOpen(true)} label={`Edit ${assignment.title}`} />
          <ConfirmDelete label={`Delete ${assignment.title}`} onDelete={() => deleteAssignment(assignment.id)} />
        </div>
      </div>
      {!done && assignment.status === "pending" && (
        <div className="mt-4">
          <Button variant="secondary" size="sm" disabled={pending} onClick={advance}>
            Start working
            <Icon name="chevronRight" className="h-4 w-4" />
          </Button>
        </div>
      )}
      <AssignmentDialog open={editOpen} onClose={() => setEditOpen(false)} subjects={subjects} initial={assignment} />
    </Card>
  );
}

type AssignmentFilter = "all" | AssignmentStatus;

export function AssignmentList({
  assignments,
  subjects,
}: {
  assignments: Assignment[];
  subjects: Subject[];
}) {
  const [filter, setFilter] = useState<AssignmentFilter>("all");
  const names = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const visible = useMemo(() => {
    const list = filter === "all" ? assignments : assignments.filter((a) => a.status === filter);
    return sortAssignments(list);
  }, [assignments, filter]);

  const counts = useMemo(() => {
    const c: Record<AssignmentFilter, number> = {
      all: assignments.length,
      pending: 0,
      in_progress: 0,
      completed: 0,
    };
    for (const a of assignments) c[a.status] += 1;
    return c;
  }, [assignments]);

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon="tasks"
        title="Nothing due"
        body="Your task list is clear. Add an assignment to start tracking deadlines."
        action={<AssignmentDialogButton subjects={subjects} />}
      />
    );
  }

  const tabs: { id: AssignmentFilter; label: string }[] = [
    { id: "all", label: `All (${counts.all})` },
    { id: "pending", label: `Pending (${counts.pending})` },
    { id: "in_progress", label: `In Progress (${counts.in_progress})` },
    { id: "completed", label: `Completed (${counts.completed})` },
  ];

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter assignments">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={cx(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              filter === t.id ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState icon="tasks" title="Nothing here" body="No assignments match this filter." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visible.map((a) => (
            <AssignmentCard
              key={a.id}
              assignment={a}
              subjects={subjects}
              subjectName={a.subject_id ? (names.get(a.subject_id) ?? "Unknown subject") : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------- Exams ---------------------------------- */

function ExamDialog({
  open,
  onClose,
  subjects,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Subject[];
  initial?: Exam;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject_id: initial?.subject_id ?? "",
    exam_date: initial ? toDateValue(initial.exam_date) : "",
    preparation_percent: String(initial?.preparation_percent ?? 0),
    syllabus: initial?.syllabus ?? "",
    weak_topics: initial?.weak_topics ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial ? await updateExam(initial.id, form) : await createExam(form);
      if (res.ok) {
        toast(initial ? "Exam updated." : "Exam added.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit exam" : "Add exam"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Subject">
            <Select value={form.subject_id} onChange={set("subject_id")}>
              <option value="">No subject</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam date" required>
            <Input type="date" value={form.exam_date} onChange={set("exam_date")} required />
          </Field>
        </div>
        <Field label="Preparation (%)" hint="Honest estimate — the AI plans around this number.">
          <Input type="number" min={0} max={100} step={1} value={form.preparation_percent} onChange={set("preparation_percent")} />
        </Field>
        <Field label="Syllabus / topics" hint="One topic per line. Only listed topics are used for planning.">
          <Textarea value={form.syllabus} onChange={set("syllabus")} placeholder={"Unit 1 — …\nUnit 2 — …"} />
        </Field>
        <Field label="Weak topics" hint="One per line. These get priority in your plan.">
          <Textarea value={form.weak_topics} onChange={set("weak_topics")} placeholder="e.g. Integration" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add exam"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ExamDialogButton({
  subjects,
  label = "Add exam",
}: {
  subjects: Subject[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <ExamDialog open={open} onClose={() => setOpen(false)} subjects={subjects} />
    </>
  );
}

function ExamCard({
  exam,
  subjectName,
  subjects,
}: {
  exam: Exam;
  subjectName: string;
  subjects: Subject[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const days = daysUntil(exam.exam_date);
  const past = days < 0;
  const urgent = !past && days <= 5;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{subjectName}</h3>
          <p className="mt-0.5 text-sm text-muted">{formatDate(exam.exam_date)}</p>
        </div>
        <div className="flex shrink-0 items-center">
          <EditButton onClick={() => setEditOpen(true)} label={`Edit ${subjectName} exam`} />
          <ConfirmDelete label={`Delete ${subjectName} exam`} onDelete={() => deleteExam(exam.id)} />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {past ? (
          <Badge tone="neutral" icon="checkCircle">
            Past exam
          </Badge>
        ) : urgent ? (
          <Badge tone="danger" icon="alert">
            {days === 0 ? "Exam today" : `${days} day${days === 1 ? "" : "s"} left`}
          </Badge>
        ) : (
          <Badge tone="info" icon="clock">
            {days} days remaining
          </Badge>
        )}
      </div>

      <div className="mt-4">
        <ProgressBar value={exam.preparation_percent} tone="info" label={`Preparation: ${exam.preparation_percent}%`} />
      </div>

      {!past && (
        <div className="mt-4">
          <Link
            href={`/study-planner?exam=${exam.id}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-dark active:scale-[0.98]"
          >
            <Icon name="spark" className="h-4 w-4" />
            Open Study Planner
          </Link>
        </div>
      )}
      <ExamDialog open={editOpen} onClose={() => setEditOpen(false)} subjects={subjects} initial={exam} />
    </Card>
  );
}

export function ExamGrid({ exams, subjects }: { exams: Exam[]; subjects: Subject[] }) {
  const names = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  if (exams.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title="No upcoming exams"
        body="Add one to activate AI planning."
        action={<ExamDialogButton subjects={subjects} />}
      />
    );
  }
  const sorted = [...exams].sort(
    (a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime()
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((e) => (
        <ExamCard
          key={e.id}
          exam={e}
          subjects={subjects}
          subjectName={e.subject_id ? (names.get(e.subject_id) ?? "Untitled exam") : "Untitled exam"}
        />
      ))}
    </div>
  );
}

/* ---------------------------------- Profile --------------------------------- */

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: profile.full_name,
    college: profile.college ?? "",
    semester: profile.semester ?? "",
  });
  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await updateProfile({
        full_name: form.full_name,
        college: form.college || null,
        semester: form.semester || null,
      });
      if (res.ok) toast("Profile updated.");
      else setError(res.error);
    });
  };

  return (
    <Card>
      <h2 className="text-base font-semibold text-ink">Profile</h2>
      <p className="mt-0.5 mb-5 text-sm text-muted">This is how CampusPilot greets you.</p>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Full name" required>
          <Input value={form.full_name} onChange={set("full_name")} required maxLength={80} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="College">
            <Input value={form.college} onChange={set("college")} maxLength={120} />
          </Field>
          <Field label="Semester">
            <Input value={form.semester} onChange={set("semester")} maxLength={20} />
          </Field>
        </div>
        <FormError message={error} />
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </form>
    </Card>
  );
}
