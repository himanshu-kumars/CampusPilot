import {
  assignmentState,
  attendancePercent,
  attendanceStatus,
  daysUntil,
} from "./calculations";
import type { Assignment, Exam, Subject } from "./types";

export interface Alert {
  key: string;
  title: string;
  detail: string;
  href: string;
  severity: "danger" | "warning" | "info";
}

/**
 * Rule-based reminders computed from live data. Keys are stable per
 * underlying item (with day granularity where re-alerting makes sense),
 * so dismissals can be persisted per user.
 */
export function buildAlerts(args: {
  subjects: Subject[];
  assignments: Assignment[];
  exams: Exam[];
  subjectName: (id: string | null) => string;
}): Alert[] {
  const { subjects, assignments, exams, subjectName } = args;
  const alerts: Alert[] = [];

  if (subjects.length === 0) {
    alerts.push({
      key: "start:subjects",
      title: "Add your first subject",
      detail: "Attendance tracking starts with one subject and two numbers.",
      href: "/attendance",
      severity: "info",
    });
  }

  for (const a of assignments) {
    const st = assignmentState(a);
    if (st === "overdue") {
      alerts.push({
        key: `overdue:${a.id}`,
        title: `Overdue: “${a.title}”`,
        detail: "This deadline has passed. Finish it before starting anything new.",
        href: "/assignments",
        severity: "danger",
      });
    } else if (st === "due-today") {
      alerts.push({
        key: `due-today:${a.id}:${new Date().toISOString().slice(0, 10)}`,
        title: `Due today: “${a.title}”`,
        detail: "Last day — aim to close this out.",
        href: "/assignments",
        severity: "warning",
      });
    }
  }

  for (const e of exams) {
    const days = daysUntil(e.exam_date);
    const name = subjectName(e.subject_id);
    if (days === 0) {
      alerts.push({
        key: `exam-today:${e.id}:${new Date().toISOString().slice(0, 10)}`,
        title: `${name} exam is today`,
        detail: "Light revision only — trust your preparation.",
        href: `/study-planner?exam=${e.id}`,
        severity: "danger",
      });
    } else if (days > 0 && days <= 3) {
      alerts.push({
        key: `exam-soon:${e.id}:${days}`,
        title: `${name} exam in ${days} day${days === 1 ? "" : "s"}`,
        detail: `Preparation is at ${e.preparation_percent}%. Consider Emergency Study Mode.`,
        href: `/study-planner?exam=${e.id}`,
        severity: "danger",
      });
    } else if (days > 3 && days <= 7 && e.preparation_percent < 50) {
      alerts.push({
        key: `exam-prep:${e.id}:${days}`,
        title: `${name} needs study time`,
        detail: `Exam in ${days} days with preparation at ${e.preparation_percent}%. Build a plan now.`,
        href: `/study-planner?exam=${e.id}`,
        severity: "warning",
      });
    }
  }

  for (const s of subjects) {
    const status = attendanceStatus(attendancePercent(s.attended, s.total), s.target_attendance);
    if (status === "critical") {
      alerts.push({
        key: `att-critical:${s.id}`,
        title: `${s.name} attendance is critical`,
        detail: `Below your ${s.target_attendance}% target. Attend every upcoming class.`,
        href: "/attendance",
        severity: "danger",
      });
    } else if (status === "watch") {
      alerts.push({
        key: `att-watch:${s.id}`,
        title: `${s.name} attendance is slipping`,
        detail: `Close to your ${s.target_attendance}% target — don't miss the next class.`,
        href: "/attendance",
        severity: "warning",
      });
    }
  }

  const rank = { danger: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 12);
}
