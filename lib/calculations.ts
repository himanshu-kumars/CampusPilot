import type { Assignment, Exam, Subject } from "./types";

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

/** Attendance percentage, or null when no classes are recorded. */
export function attendancePercent(attended: number, total: number): number | null {
  if (!Number.isFinite(attended) || !Number.isFinite(total) || total <= 0) return null;
  return (attended / total) * 100;
}

export type AttendanceStatus = "healthy" | "watch" | "critical" | "none";

/**
 * Risk state. Threshold choice (documented): healthy at/above target,
 * watch within 5 points below target, critical when further below.
 */
export function attendanceStatus(
  percent: number | null,
  target: number
): AttendanceStatus {
  if (percent === null) return "none";
  if (percent >= target) return "healthy";
  if (percent >= target - 5) return "watch";
  return "critical";
}

/**
 * Smallest non-negative integer x with (A+x)/(T+x) >= target.
 * Returns 0 when the target is already met, null when unreachable
 * (only possible for a 100% target with imperfect record).
 */
export function classesNeeded(
  attended: number,
  total: number,
  targetPercent: number
): number | null {
  const p = targetPercent / 100;
  if (p >= 1) return total > 0 && attended === total ? 0 : null;
  if (p <= 0) return 0;
  if (total > 0 && attended / total >= p) return 0;
  const x = (p * total - attended) / (1 - p);
  return Math.max(0, Math.ceil(x - 1e-9));
}

export function overallAttendance(subjects: Subject[]): number | null {
  const total = subjects.reduce((sum, s) => sum + s.total, 0);
  if (total <= 0) return null;
  const attended = subjects.reduce((sum, s) => sum + s.attended, 0);
  return (attended / total) * 100;
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function daysUntil(dateIso: string): number {
  const target = new Date(dateIso);
  const now = new Date();
  const a = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function greeting(name: string): string {
  const hour = new Date().getHours();
  const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  return `Good ${part}, ${name} \u{1F44B}`;
}

/** Convert an ISO string to a datetime-local input value (local time). */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

/** Convert an ISO string to a date input value (local time). */
export function toDateValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */

export type AssignmentState = "completed" | "overdue" | "due-today" | "due-soon" | "upcoming";

export function assignmentState(a: Assignment): AssignmentState {
  if (a.status === "completed") return "completed";
  const now = Date.now();
  const deadline = new Date(a.deadline).getTime();
  if (deadline < now) return "overdue";
  const days = daysUntil(a.deadline);
  if (days <= 0) return "due-today";
  if (days <= 3) return "due-soon";
  return "upcoming";
}

const PRIORITY_WEIGHT: Record<Assignment["priority"], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Overdue first, then earliest deadline, then highest priority, completed last. */
export function sortAssignments(list: Assignment[]): Assignment[] {
  const rank = (a: Assignment): number => {
    const s = assignmentState(a);
    if (s === "completed") return 4;
    if (s === "overdue") return 0;
    if (s === "due-today") return 1;
    return 2;
  };
  return [...list].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const d =
      new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    if (d !== 0) return d;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });
}

/* ------------------------------------------------------------------ */
/* Smart daily recommendation (rule-based, computed from real data)    */
/* ------------------------------------------------------------------ */

export interface Insight {
  title: string;
  detail: string;
  ctaLabel: string;
  ctaHref: string;
}

export function buildInsight(args: {
  subjects: Subject[];
  assignments: Assignment[];
  exams: Exam[];
  subjectName: (id: string | null) => string;
}): Insight {
  const { subjects, assignments, exams, subjectName } = args;

  const overdue = sortAssignments(assignments.filter((a) => assignmentState(a) === "overdue"))[0];
  if (overdue) {
    return {
      title: "Clear your overdue work first",
      detail: `\u201C${overdue.title}\u201D is overdue. Finishing it unblocks everything else on your plate.`,
      ctaLabel: "Open assignments",
      ctaHref: "/assignments",
    };
  }

  const critical = subjects.find(
    (s) => attendanceStatus(attendancePercent(s.attended, s.total), s.target_attendance) === "critical"
  );
  if (critical) {
    const need = classesNeeded(critical.attended, critical.total, critical.target_attendance);
    return {
      title: `${critical.name} attendance needs attention`,
      detail:
        need === null
          ? `Attendance is below the ${critical.target_attendance}% target. Attend every upcoming class.`
          : `Attend the next ${need} class${need === 1 ? "" : "es"} in a row to get back to ${critical.target_attendance}%.`,
      ctaLabel: "Open attendance",
      ctaHref: "/attendance",
    };
  }

  const upcoming = exams
    .filter((e) => daysUntil(e.exam_date) >= 0)
    .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0];
  if (upcoming) {
    const days = daysUntil(upcoming.exam_date);
    const name = subjectName(upcoming.subject_id);
    if (days <= 7) {
      return {
        title: `${name} exam is ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}`,
        detail: `Preparation is at ${upcoming.preparation_percent}%. Generate a focused plan that fits your remaining time.`,
        ctaLabel: "Build study plan",
        ctaHref: `/study-planner?exam=${upcoming.id}`,
      };
    }
  }

  const nextDue = sortAssignments(
    assignments.filter((a) => a.status !== "completed")
  )[0];
  if (nextDue) {
    const days = daysUntil(nextDue.deadline);
    return {
      title: `Next up: \u201C${nextDue.title}\u201D`,
      detail:
        days <= 0
          ? "This is due today. Aim to finish it before starting anything new."
          : `Due in ${days} day${days === 1 ? "" : "s"}. Starting early keeps your week calm.`,
      ctaLabel: "Open assignments",
      ctaHref: "/assignments",
    };
  }

  if (upcoming) {
    const name = subjectName(upcoming.subject_id);
    return {
      title: `Stay ahead for ${name}`,
      detail: `The exam is ${daysUntil(upcoming.exam_date)} days away with preparation at ${upcoming.preparation_percent}%. A steady plan now beats cramming later.`,
      ctaLabel: "Build study plan",
      ctaHref: `/study-planner?exam=${upcoming.id}`,
    };
  }

  return {
    title: "Your week looks clear",
    detail: "Add your subjects, assignments and exams so CampusPilot can keep watch for you.",
    ctaLabel: "Add a subject",
    ctaHref: "/attendance",
  };
}
