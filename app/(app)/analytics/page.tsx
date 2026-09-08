import { redirect } from "next/navigation";
import { Badge, Card, Icon, PageHeader, ProgressBar, SetupRequired, cx, type IconName } from "@/components/ui";
import {
  assignmentState,
  attendancePercent,
  attendanceStatus,
  daysUntil,
  overallAttendance,
} from "@/lib/calculations";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { ActivityEvent, Assignment, Exam, Subject } from "@/lib/types";
import { summarizeXp, type XpEvent } from "@/lib/xp";

function Stat({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: IconName }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-primary">
          <Icon name={icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-xs text-muted">{helper}</p>
    </Card>
  );
}

const KIND_LABEL: Record<string, string> = {
  subject_created: "Subject",
  assignment_created: "Assignment",
  assignment_completed: "Completed",
  exam_created: "Exam",
  plan_generated: "Study plan",
  note_created: "Note",
  ai_summary: "Summary",
  ai_questions: "Questions",
  viva_turn: "Viva",
  viva_completed: "Viva",
  quiz_completed: "Quiz",
  study_task_completed: "Study task",
  class_recorded: "Class",
  viva_question_answered: "Viva",
  group_created: "Group",
  group_joined: "Group",
  group_task_completed: "Group task",
  share_created: "Share",
  csv_imported: "Import",
  internship_added: "Application",
  internship_offer: "Offer",
  internship_accepted: "Accepted",
};

export default async function AnalyticsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="How your semester is shaping up." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/analytics");

  const supabase = await createClient();
  const [{ data: subjects }, { data: assignments }, { data: exams }, { data: events }, { data: sets }, { data: plans }, { data: xpEvents }] =
    await Promise.all([
      supabase.from("subjects").select("*").order("name"),
      supabase.from("assignments").select("*").limit(500),
      supabase.from("exams").select("*").order("exam_date", { ascending: true }),
      supabase.from("activity_events").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("practice_sets").select("attempts,best_score"),
      supabase.from("study_plans").select("id", { count: "exact", head: false }).limit(1),
      supabase.from("activity_events").select("kind, created_at").order("created_at", { ascending: false }).limit(5000),
    ]);

  const subjectList = (subjects ?? []) as Subject[];
  const assignmentList = (assignments ?? []) as Assignment[];
  const examList = (exams ?? []) as Exam[];
  const allEvents = (events ?? []) as ActivityEvent[];
  const planCount = Array.isArray(plans) ? plans.length : 0;

  const overall = overallAttendance(subjectList);
  const completed = assignmentList.filter((a) => a.status === "completed").length;
  const completionRate = assignmentList.length > 0 ? Math.round((completed / assignmentList.length) * 100) : null;
  const quizAttempts = ((sets ?? []) as { attempts: number }[]).reduce((s, x) => s + (x.attempts ?? 0), 0);

  // Last-14-days activity.
  const days: { label: string; count: number; isToday: boolean }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const count = allEvents.filter((e) => e.created_at.slice(0, 10) === key).length;
    days.push({
      label: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      count,
      isToday: i === 0,
    });
  }
  const maxDay = Math.max(1, ...days.map((d) => d.count));
  const activeDays = days.filter((d) => d.count > 0).length;

  // Assignment status donut.
  const pending = assignmentList.filter((a) => a.status === "pending").length;
  const inProgress = assignmentList.filter((a) => a.status === "in_progress").length;
  const totalA = Math.max(1, assignmentList.length);
  const donut = `conic-gradient(#16a34a 0 ${(completed / totalA) * 100}%, #4f46e5 ${(completed / totalA) * 100} ${((completed + inProgress) / totalA) * 100}%, #e5e7eb ${((completed + inProgress) / totalA) * 100}% 100%)`;

  const upcomingExams = examList.filter((e) => daysUntil(e.exam_date) >= 0).slice(0, 6);
  const names = new Map(subjectList.map((s) => [s.id, s.name]));
  const overdue = assignmentList.filter((a) => assignmentState(a) === "overdue").length;

  // Day streak (today may still be empty).
  let streak = 0;
  {
    const skipToday = (days[13]?.count ?? 0) === 0 ? 1 : 0;
    for (let i = 13 - skipToday; i >= 0; i--) {
      if ((days[i]?.count ?? 0) > 0) streak++;
      else break;
    }
  }
  const xp = summarizeXp((xpEvents ?? allEvents) as XpEvent[], streak);
  // Week in review.
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recentEvents = allEvents.filter((e) => new Date(e.created_at).getTime() >= weekAgo);
  const tasksDoneWeek = recentEvents.filter((e) => e.kind === "study_task_completed").length;
  const quizzesWeek = recentEvents.filter((e) => e.kind === "quiz_completed").length;
  // Focus-subject scoring: overdue ×3, critical attendance ×5, watch ×2, near exam ×4.
  const focusScores = new Map<string, { name: string; score: number; reasons: string[] }>();
  const bump = (id: string | null, pts: number, reason: string) => {
    if (!id) return;
    const cur = focusScores.get(id) ?? { name: names.get(id) ?? "Untitled", score: 0, reasons: [] as string[] };
    cur.score += pts;
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason);
    focusScores.set(id, cur);
  };
  for (const a of assignmentList) {
    const st = assignmentState(a);
    if (st === "overdue") bump(a.subject_id, 3, "overdue work");
    else if (st === "due-today" || st === "due-soon") bump(a.subject_id, 1, "upcoming deadlines");
  }
  for (const s of subjectList) {
    const st = attendanceStatus(attendancePercent(s.attended, s.total), s.target_attendance);
    if (st === "critical") bump(s.id, 5, "critical attendance");
    else if (st === "watch") bump(s.id, 2, "slipping attendance");
  }
  for (const e of upcomingExams) {
    const d = daysUntil(e.exam_date);
    if (d <= 7 && e.preparation_percent < 60) bump(e.subject_id, 4, `exam in ${d}d at ${e.preparation_percent}%`);
  }
  const focus = [...focusScores.values()].sort((a, b) => b.score - a.score)[0];
  // Preparation momentum from logged prep changes.
  let momentum = 0;
  let momentumN = 0;
  for (const e of allEvents) {
    if (e.kind !== "exam_prep_updated") continue;
    const m = e.label.match(/(\d+)%\s*→\s*(\d+)%/);
    if (m) {
      momentum += Number(m[2]) - Number(m[1]);
      momentumN++;
    }
  }

  const insights: string[] = [];
  if (focus) insights.push(`Recommended focus: ${focus.name} (${focus.reasons.join(", ")}).`);
  if (streak >= 2) insights.push(`You're on a ${streak}-day streak — consistency compounds.`);
  else if (streak === 0 && allEvents.length > 0) insights.push("No activity yet in the last two days — even one small task restarts momentum.");
  if (momentumN > 0) {
    insights.push(
      momentum >= 0
        ? `Preparation momentum is +${momentum} points across ${momentumN} update${momentumN === 1 ? "" : "s"}.`
        : `Preparation slipped ${momentum} points across recent updates — revisit your estimates honestly.`
    );
  }
  if (tasksDoneWeek > 0 || quizzesWeek > 0) {
    insights.push(
      `This week: ${tasksDoneWeek} study task${tasksDoneWeek === 1 ? "" : "s"} and ${quizzesWeek} quiz${quizzesWeek === 1 ? "" : "zes"} completed.`
    );
  }
  if (overdue > 0) insights.push(`${overdue} overdue assignment${overdue === 1 ? "" : "s"} dragging the week down — clear them first.`);
  const bestDay = days.reduce((a, b) => (b.count > a.count ? b : a), days[0] as { label: string; count: number });
  if (bestDay.count > 0) insights.push(`Most active recently: ${bestDay.label} with ${bestDay.count} logged action${bestDay.count === 1 ? "" : "s"}.`);
  if (completionRate !== null) {
    insights.push(
      completionRate >= 70
        ? `Assignment completion at ${completionRate}% — strong follow-through.`
        : `Assignment completion at ${completionRate}% — finishing beats starting.`
    );
  }
  const weakest = subjectList
    .map((s) => ({ s, p: attendancePercent(s.attended, s.total) }))
    .filter((x) => x.p !== null)
    .sort((a, b) => (a.p as number) - (b.p as number))[0];
  if (weakest) insights.push(`Weakest attendance: ${weakest.s.name} at ${Math.round((weakest.p as number) * 10) / 10}%.`);
  if (insights.length === 0) insights.push("Use CampusPilot for a few days and patterns will show up here.");

  return (
    <>
      <PageHeader title="Analytics" subtitle="How your semester is shaping up." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Overall attendance" value={overall === null ? "—" : `${Math.round(overall * 10) / 10}%`} helper="Across all subjects" icon="target" />
        <Stat label="Assignment completion" value={completionRate === null ? "—" : `${completionRate}%`} helper={`${completed} of ${assignmentList.length} done`} icon="tasks" />
        <Stat label="Active days" value={`${activeDays}/14`} helper="Days with logged activity" icon="chart" />
        <Stat label="Day streak" value={streak === 0 ? "—" : `${streak}`} helper={streak >= 2 ? "Keep it going" : quizAttempts > 0 ? `${quizAttempts} quiz attempts so far` : "Do one thing today to start"} icon="checkCircle" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* XP level */}
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <Icon name="trophy" className="h-5 w-5 text-warning" />
              Level {xp.level}
            </h2>
            <Badge tone="info">{xp.totalXp.toLocaleString()} XP</Badge>
          </div>
          <p className="mt-0.5 mb-3 text-sm text-muted">
            Earned from {xp.actionsCount} logged action{xp.actionsCount === 1 ? "" : "s"} — every point traces to something you did.
          </p>
          <ProgressBar
            value={xp.progress * 100}
            tone="info"
            label={`${xp.intoLevel.toLocaleString()} / ${xp.neededForNext.toLocaleString()} XP to Level ${xp.level + 1}`}
          />
          {xp.byKind.length > 0 && (
            <ul className="mt-4 space-y-2">
              {xp.byKind.slice(0, 5).map((k) => (
                <li key={k.kind} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted">{KIND_LABEL[k.kind] ?? "Activity"} × {k.count}</span>
                  <span className="shrink-0 font-semibold text-ink">+{k.xp.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Badges */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Badges</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">
            {xp.badges.filter((b) => b.earned).length} of {xp.badges.length} earned.
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {xp.badges.map((b) => (
              <li
                key={b.id}
                className={cx(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2",
                  b.earned ? "border-line bg-surface" : "border-line opacity-50"
                )}
              >
                <span
                  className={cx(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    b.earned ? "bg-amber-100 text-warning" : "bg-slate-100 text-muted"
                  )}
                >
                  <Icon name="trophy" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink">{b.name}</span>
                  <span className="block truncate text-xs text-muted">{b.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Activity chart */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Activity — last 14 days</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">Logged actions per day.</p>
          <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Activity bar chart for the last 14 days">
            {days.map((d, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-28 w-full items-end">
                  <div
                    className={cx("w-full rounded-t-md transition-all", d.isToday ? "bg-primary" : "bg-indigo-200")}
                    style={{ height: `${Math.max(4, (d.count / maxDay) * 100)}%` }}
                    title={`${d.count} actions`}
                  />
                </div>
                <span className={cx("text-[10px]", d.isToday ? "font-bold text-primary" : "text-muted")}>{d.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Assignment donut */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Assignment mix</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">Where your workload stands.</p>
          <div className="flex items-center gap-6">
            <div className="relative h-32 w-32 shrink-0">
              <div className="h-full w-full rounded-full" style={{ background: donut }} />
              <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-surface">
                <span className="text-2xl font-bold text-ink">{assignmentList.length}</span>
                <span className="text-[11px] text-muted">total</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-success" /> Completed · <strong className="text-ink">{completed}</strong>
              </li>
              <li className="flex items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> In progress · <strong className="text-ink">{inProgress}</strong>
              </li>
              <li className="flex items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Pending · <strong className="text-ink">{pending}</strong>
              </li>
            </ul>
          </div>
        </Card>

        {/* Subject attendance bars */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Attendance by subject</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">Estimated from your recorded numbers.</p>
          {subjectList.length === 0 ? (
            <p className="text-sm text-muted">No subjects yet.</p>
          ) : (
            <ul className="space-y-3">
              {subjectList.map((s) => {
                const p = attendancePercent(s.attended, s.total);
                const pct = p === null ? 0 : Math.min(100, p);
                return (
                  <li key={s.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="truncate font-medium text-ink">{s.name}</span>
                      <span className="text-muted">{p === null ? "—" : `${Math.round(p * 10) / 10}%`}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={cx("h-full rounded-full", p === null ? "bg-slate-300" : p >= s.target_attendance ? "bg-success" : p >= s.target_attendance - 5 ? "bg-warning" : "bg-danger")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Exam readiness */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Exam readiness</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">Preparation vs. days remaining.</p>
          {upcomingExams.length === 0 ? (
            <p className="text-sm text-muted">No upcoming exams.</p>
          ) : (
            <ul className="space-y-3">
              {upcomingExams.map((e) => (
                <li key={e.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-ink">
                      {e.subject_id ? (names.get(e.subject_id) ?? "Exam") : "Exam"}
                    </span>
                    <span className="text-muted">
                      {e.preparation_percent}% · {daysUntil(e.exam_date)}d left
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${e.preparation_percent}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Insights */}
        <Card>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Icon name="spark" className="h-5 w-5 text-primary" />
            Insights
          </h2>
          <ul className="mt-3 space-y-2">
            {insights.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <Icon name="chevronRight" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {t}
              </li>
            ))}
          </ul>
        </Card>

        {/* Recent activity */}
        <Card>
          <h2 className="text-base font-semibold text-ink">Recent activity</h2>
          {allEvents.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No activity yet — it builds as you use the app.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {allEvents.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center gap-2.5 text-sm">
                  <Badge tone="neutral">{KIND_LABEL[e.kind] ?? "Activity"}</Badge>
                  <span className="min-w-0 flex-1 truncate text-muted">{e.label}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {new Date(e.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
