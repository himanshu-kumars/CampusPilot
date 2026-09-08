import Link from "next/link";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/actions";
import {
  assignmentState,
  attendancePercent,
  attendanceStatus,
  buildInsight,
  classesNeeded,
  daysUntil,
  formatDate,
  greeting,
  overallAttendance,
  sortAssignments,
} from "@/lib/calculations";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Assignment, Exam, Subject, TimetableEntry } from "@/lib/types";
import { TodaysClasses } from "@/components/timetable";
import { Badge, ButtonLink, Card, Icon, PageHeader, SetupRequired, cx, type IconName } from "@/components/ui";

function StatCard({
  label,
  value,
  helper,
  icon,
  href,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: IconName;
  href: string;
  tone: "info" | "warning" | "danger" | "success";
}) {
  const iconStyles = {
    info: "bg-indigo-50 text-primary",
    warning: "bg-amber-50 text-warning",
    danger: "bg-red-50 text-danger",
    success: "bg-emerald-50 text-success",
  } as const;
  return (
    <Link href={href} className="block transition-transform duration-150 hover:-translate-y-0.5">
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">{label}</p>
          <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", iconStyles[tone])}>
            <Icon name={icon} className="h-5 w-5" />
          </span>
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
        <p className="mt-1 text-xs text-muted">{helper}</p>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your academic command center." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  const supabase = await createClient();
  const profile = await ensureProfile();
  const [{ data: subjects }, { data: assignments }, { data: exams }, { data: timetable }] = await Promise.all([
    supabase.from("subjects").select("*").order("name"),
    supabase.from("assignments").select("*").order("deadline", { ascending: true }).limit(100),
    supabase.from("exams").select("*").order("exam_date", { ascending: true }).limit(50),
    supabase.from("timetable_entries").select("*").order("start_time"),
  ]);

  const subjectList = (subjects ?? []) as Subject[];
  const assignmentList = (assignments ?? []) as Assignment[];
  const examList = (exams ?? []) as Exam[];
  const names = new Map(subjectList.map((s) => [s.id, s.name]));
  const subjectName = (id: string | null) => (id ? (names.get(id) ?? "Untitled") : "Untitled");

  const overall = overallAttendance(subjectList);
  const openAssignments = assignmentList.filter((a) => a.status !== "completed");
  const upcomingExams = examList.filter((e) => daysUntil(e.exam_date) >= 0);
  const nextExam = upcomingExams[0];
  const avgPrep =
    upcomingExams.length > 0
      ? Math.round(upcomingExams.reduce((s, e) => s + e.preparation_percent, 0) / upcomingExams.length)
      : null;

  const insight = buildInsight({ subjects: subjectList, assignments: assignmentList, exams: examList, subjectName });

  const risky = subjectList
    .map((s) => ({ s, status: attendanceStatus(attendancePercent(s.attended, s.total), s.target_attendance) }))
    .filter((x) => x.status === "critical" || x.status === "watch")
    .sort((a, b) => (a.status === b.status ? 0 : a.status === "critical" ? -1 : 1));

  const priorities: { icon: IconName; text: string; href: string; tone: "danger" | "warning" | "info" }[] = [];
  for (const a of sortAssignments(assignmentList)) {
    if (priorities.length >= 5) break;
    const st = assignmentState(a);
    if (st === "overdue") priorities.push({ icon: "alert", text: `Overdue: “${a.title}”`, href: "/assignments", tone: "danger" });
    else if (st === "due-today") priorities.push({ icon: "clock", text: `Due today: “${a.title}”`, href: "/assignments", tone: "warning" });
  }
  for (const { s, status } of risky) {
    if (priorities.length >= 5) break;
    priorities.push({
      icon: "target",
      text: `${s.name} attendance is ${status} (${Math.round((attendancePercent(s.attended, s.total) ?? 0) * 10) / 10}%)`,
      href: "/attendance",
      tone: status === "critical" ? "danger" : "warning",
    });
  }
  if (nextExam && daysUntil(nextExam.exam_date) <= 7 && priorities.length < 5) {
    priorities.push({
      icon: "calendar",
      text: `${subjectName(nextExam.subject_id)} exam in ${daysUntil(nextExam.exam_date)} day(s) — ${nextExam.preparation_percent}% ready`,
      href: "/exams",
      tone: "info",
    });
  }
  for (const a of sortAssignments(openAssignments)) {
    if (priorities.length >= 5) break;
    if (assignmentState(a) === "due-soon") {
      priorities.push({ icon: "tasks", text: `Due soon: “${a.title}”`, href: "/assignments", tone: "info" });
    }
  }

  const recent = sortAssignments(openAssignments).slice(0, 5);
  const worstRisk = risky[0];

  return (
    <>
      <PageHeader
        title={greeting(profile?.full_name?.split(" ")[0] ?? "there")}
        subtitle="Here's what needs your attention today."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Overall attendance"
          value={overall === null ? "—" : `${Math.round(overall * 10) / 10}%`}
          helper={overall === null ? "Add subjects to start tracking" : "Across all subjects"}
          icon="target"
          href="/attendance"
          tone={overall === null ? "info" : overall >= 75 ? "success" : overall >= 70 ? "warning" : "danger"}
        />
        <StatCard
          label="Assignments due"
          value={String(openAssignments.length)}
          helper={openAssignments.length === 0 ? "Your task list is clear" : "Pending + in progress"}
          icon="tasks"
          href="/assignments"
          tone={openAssignments.length === 0 ? "success" : "warning"}
        />
        <StatCard
          label="Next exam"
          value={nextExam ? (daysUntil(nextExam.exam_date) === 0 ? "Today" : `${daysUntil(nextExam.exam_date)}d`) : "—"}
          helper={nextExam ? `${subjectName(nextExam.subject_id)} · ${formatDate(nextExam.exam_date)}` : "No upcoming exams"}
          icon="calendar"
          href="/exams"
          tone={nextExam && daysUntil(nextExam.exam_date) <= 5 ? "danger" : "info"}
        />
        <StatCard
          label="Avg. preparation"
          value={avgPrep === null ? "—" : `${avgPrep}%`}
          helper={avgPrep === null ? "Add exams to track readiness" : "Across upcoming exams"}
          icon="book"
          href="/exams"
          tone="success"
        />
      </div>

      <div className="mt-6">
        <TodaysClasses entries={(timetable ?? []) as TimetableEntry[]} subjects={subjectList} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Today's priorities */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Today&apos;s priorities</h2>
          {priorities.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              All clear. Add subjects, assignments and exams and CampusPilot will keep watch for you.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {priorities.map((p, i) => (
                <li key={i}>
                  <Link
                    href={p.href}
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:bg-slate-50"
                  >
                    <span
                      className={cx(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        p.tone === "danger" && "bg-red-50 text-danger",
                        p.tone === "warning" && "bg-amber-50 text-warning",
                        p.tone === "info" && "bg-indigo-50 text-primary"
                      )}
                    >
                      <Icon name={p.icon} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{p.text}</span>
                    <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* AI insight */}
        <Card className="flex flex-col bg-ink text-white">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-indigo-300 uppercase">
            <Icon name="spark" className="h-4 w-4" />
            AI recommendation
          </p>
          <h2 className="mt-2 text-lg font-semibold">{insight.title}</h2>
          <p className="mt-1 flex-1 text-sm text-white/70">{insight.detail}</p>
          <div className="mt-5">
            <ButtonLink href={insight.ctaHref} className="bg-white text-ink hover:bg-white/90">
              {insight.ctaLabel}
              <Icon name="chevronRight" className="h-4 w-4" />
            </ButtonLink>
          </div>
        </Card>
      </div>

      {/* Attendance alert */}
      {worstRisk && (
        <div
          className={cx(
            "mt-4 flex items-start gap-3 rounded-2xl px-5 py-4 ring-1",
            worstRisk.status === "critical" ? "bg-red-50 ring-red-600/20" : "bg-amber-50 ring-amber-600/25"
          )}
        >
          <Icon
            name="alert"
            className={cx("mt-0.5 h-5 w-5 shrink-0", worstRisk.status === "critical" ? "text-danger" : "text-warning")}
          />
          <div className="text-sm">
            <p className="font-semibold text-ink">
              {worstRisk.s.name} is at {Math.round((attendancePercent(worstRisk.s.attended, worstRisk.s.total) ?? 0) * 10) / 10}%.
              Attendance needs attention.
            </p>
            <p className="mt-0.5 text-muted">
              {(() => {
                const need = classesNeeded(worstRisk.s.attended, worstRisk.s.total, worstRisk.s.target_attendance);
                if (need === 0) return "Target reached.";
                if (need === null) return "Attend every upcoming class.";
                return `Attend the next ${need} class(es) in a row to reach ${worstRisk.s.target_attendance}%.`;
              })()}{" "}
              <Link href="/attendance" className="font-semibold text-primary hover:underline">
                Open attendance
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Recent assignments */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Upcoming assignments</h2>
          <Link href="/assignments" className="text-sm font-semibold text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Nothing due. Your task list is clear.</p>
          </Card>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {recent.map((a) => {
              const st = assignmentState(a);
              return (
                <Link key={a.id} href="/assignments" className="block transition-transform duration-150 hover:-translate-y-0.5">
                  <Card className="flex items-center gap-3 p-4">
                    <span
                      className={cx(
                        "h-9 w-1.5 shrink-0 rounded-full",
                        st === "overdue" && "bg-danger",
                        st === "due-today" && "bg-warning",
                        st === "due-soon" && "bg-primary",
                        st === "upcoming" && "bg-slate-200"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{a.title}</span>
                      <span className="block text-xs text-muted">
                        {subjectName(a.subject_id)} · Due {formatDate(a.deadline)}
                      </span>
                    </span>
                    <Badge tone={st === "overdue" ? "danger" : st === "due-today" ? "warning" : "neutral"}>
                      {st === "overdue" ? "Overdue" : st === "due-today" ? "Due today" : `${daysUntil(a.deadline)}d left`}
                    </Badge>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
