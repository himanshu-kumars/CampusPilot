import { notFound } from "next/navigation";
import { ShareFeedbackForm } from "@/components/sharing";
import { Badge, Card, Icon } from "@/components/ui";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface ShareReport {
  name: string;
  label: string | null;
  subjects: { name: string; attended: number; total: number; target: number }[];
  assignments: { title: string; deadline: string; priority: string; status: string }[];
  exams: { date: string; prep: number; subject: string | null }[];
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!supabaseConfigured()) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_share_report", { p_token: token });
  if (error || !data) notFound();
  const report = data as ShareReport;

  const { data: thread } = await supabase.rpc("get_share_feedback", { p_token: token });
  const notes = ((thread ?? []) as {
    author_name: string;
    message: string;
    reply: string | null;
    created_at: string;
  }[]).filter((n) => n.author_name && n.message);

  const total = report.subjects.reduce((s, x) => s + x.total, 0);
  const attended = report.subjects.reduce((s, x) => s + x.attended, 0);
  const overall = total > 0 ? Math.round((attended / total) * 1000) / 10 : null;
  const upcoming = report.exams
    .filter((e) => new Date(e.date).getTime() >= Date.now() - 86_400_000)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
              <Icon name="compass" className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-ink">CampusPilot</span>
          </span>
          <Badge tone="info">Read-only mentor report</Badge>
        </div>

        <Card>
          <p className="text-sm text-muted">
            {report.label ? `${report.label} · ` : ""}Generated{" "}
            {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {report.name}&apos;s progress
          </h1>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Attendance</p>
              <p className="mt-1 text-2xl font-bold text-ink">{overall === null ? "—" : `${overall}%`}</p>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Open tasks</p>
              <p className="mt-1 text-2xl font-bold text-ink">{report.assignments.length}</p>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Upcoming exams</p>
              <p className="mt-1 text-2xl font-bold text-ink">{upcoming.length}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-base font-semibold text-ink">Attendance by subject</h2>
          {report.subjects.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No subjects recorded.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {report.subjects.map((s, i) => {
                const pct = s.total > 0 ? (s.attended / s.total) * 100 : null;
                return (
                  <li key={i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{s.name}</span>
                      <span className="text-muted">
                        {pct === null ? "—" : `${Math.round(pct * 10) / 10}%`} · target {s.target}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={
                          pct === null
                            ? "h-full rounded-full bg-slate-300"
                            : pct >= s.target
                              ? "h-full rounded-full bg-success"
                              : pct >= s.target - 5
                                ? "h-full rounded-full bg-warning"
                                : "h-full rounded-full bg-danger"
                        }
                        style={{ width: `${pct === null ? 0 : Math.min(100, pct)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <h2 className="text-base font-semibold text-ink">Open assignments</h2>
            {report.assignments.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Nothing pending.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {report.assignments.slice(0, 8).map((a, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium text-ink">{a.title}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {new Date(a.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="text-base font-semibold text-ink">Exam readiness</h2>
            {upcoming.length === 0 ? (
              <p className="mt-2 text-sm text-muted">No upcoming exams.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcoming.map((e, i) => (
                  <li key={i}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{e.subject || "Exam"}</span>
                      <span className="text-muted">{e.prep}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${e.prep}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {notes.length > 0 && (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-ink">Discussion</h2>
            <ul className="space-y-4">
              {notes.map((n, i) => (
                <li key={i}>
                  <p className="text-sm font-semibold text-ink">
                    {n.author_name}
                    <span className="ml-1.5 font-normal text-muted">
                      {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{n.message}</p>
                  {n.reply && (
                    <p className="mt-1.5 ml-4 rounded-lg border-l-2 border-primary bg-canvas py-1.5 pr-2 pl-3 text-sm text-muted">
                      <span className="font-semibold text-ink">{report.name} replied: </span>
                      {n.reply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <ShareFeedbackForm token={token} />

        <p className="pt-2 text-center text-xs text-muted">
          Shared read-only via CampusPilot. Attendance figures are student-recorded estimates.
        </p>
      </div>
    </div>
  );
}
