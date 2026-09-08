"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { daysUntil } from "@/lib/calculations";
import type { StudyPlan } from "@/lib/validation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  ProgressBar,
  Select,
  Textarea,
  cx,
} from "./ui";

export interface PlannerExam {
  id: string;
  name: string;
  exam_date: string;
  preparation_percent: number;
  syllabus: string | null;
  weak_topics: string | null;
}

interface PlanResult {
  plan: StudyPlan;
  planId: string | null;
  source: "ai" | "fallback";
}

const URGENCY_META: Record<StudyPlan["urgency"], { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  low: { label: "Low urgency", tone: "success" },
  medium: { label: "Medium urgency", tone: "info" },
  high: { label: "High urgency", tone: "warning" },
  critical: { label: "Critical urgency", tone: "danger" },
};

const TYPE_META: Record<string, { label: string; tone: "success" | "warning" | "danger" | "info" | "neutral" }> = {
  learn: { label: "Learn", tone: "info" },
  practice: { label: "Practice", tone: "warning" },
  revision: { label: "Revision", tone: "success" },
  mock: { label: "Mock", tone: "danger" },
  break: { label: "Break", tone: "neutral" },
};

function toList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}

const LOADING_MESSAGES = [
  "Reading your exam constraints…",
  "Weighing topics by urgency…",
  "Fitting tasks into your available hours…",
  "Protecting revision and practice time…",
];

export function StudyPlanner({
  exams,
  initialExamId,
}: {
  exams: PlannerExam[];
  initialExamId?: string;
}) {
  const validInitial = exams.some((e) => e.id === initialExamId) ? initialExamId : exams[0]?.id ?? "";
  const [examId, setExamId] = useState(validInitial);
  const exam = useMemo(() => exams.find((e) => e.id === examId), [exams, examId]);

  const [hours, setHours] = useState("4");
  const [prep, setPrep] = useState(String(exam?.preparation_percent ?? 0));
  const [syllabus, setSyllabus] = useState(exam?.syllabus ?? "");
  const [weak, setWeak] = useState(exam?.weak_topics ?? "");
  const [emergency, setEmergency] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const resultRef = useRef<HTMLDivElement>(null);

  // Prefill from the selected exam.
  const selectExam = (id: string) => {
    setExamId(id);
    const e = exams.find((x) => x.id === id);
    if (e) {
      setPrep(String(e.preparation_percent));
      setSyllabus(e.syllabus ?? "");
      setWeak(e.weak_topics ?? "");
    }
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (!loading) return;
    const t = window.setInterval(() => setLoadingStep((s) => (s + 1) % LOADING_MESSAGES.length), 1600);
    return () => window.clearInterval(t);
  }, [loading]);

  // Load persisted task progress for this plan.
  useEffect(() => {
    if (!result) return;
    try {
      const key = `cp-plan-progress:${result.planId ?? examId}`;
      const raw = window.localStorage.getItem(key);
      setChecked(raw ? (JSON.parse(raw) as string[]) : []);
    } catch {
      setChecked([]);
    }
  }, [result, examId]);

  const toggleTask = useCallback(
    (taskKey: string) => {
      if (!result) return;
      const completing = !checked.includes(taskKey);
      const next = completing ? [...checked, taskKey] : checked.filter((k) => k !== taskKey);
      setChecked(next);
      try {
        window.localStorage.setItem(`cp-plan-progress:${result.planId ?? examId}`, JSON.stringify(next));
      } catch {
        /* storage unavailable — progress just won't persist */
      }
      if (completing) {
        fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "study_task_completed", label: "Completed a study-plan task" }),
        }).catch(() => {
          /* analytics must not break the interaction */
        });
      }
    },
    [result, examId, checked]
  );

  if (exams.length === 0) {
    return (
      <EmptyState
        icon="spark"
        title="Choose an exam to build your plan"
        body="Add an exam first — the planner needs a real date, preparation level and syllabus to work with."
        action={<ButtonLink href="/exams">Go to exams</ButtonLink>}
      />
    );
  }

  const daysRemaining = exam ? daysUntil(exam.exam_date) : 0;

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam) return;
    setError(null);
    setResult(null);
    const parsedHours = Number(hours);
    const parsedPrep = Number(prep);
    if (!Number.isFinite(parsedHours) || parsedHours < 0.5 || parsedHours > 16) {
      setError("Available hours must be between 0.5 and 16 per day.");
      return;
    }
    if (!Number.isInteger(parsedPrep) || parsedPrep < 0 || parsedPrep > 100) {
      setError("Preparation must be a whole number between 0 and 100.");
      return;
    }
    setLoading(true);
    setLoadingStep(0);
    try {
      const res = await fetch("/api/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: exam.id,
          availableHoursPerDay: parsedHours,
          preparationPercent: parsedPrep,
          syllabus: toList(syllabus),
          weakTopics: toList(weak),
          emergency,
        }),
      });
      const json = (await res.json()) as
        | { success: true; studyPlan: StudyPlan; planId: string | null; source: "ai" | "fallback" }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        setError(
          (json as { error?: string }).error ??
            "Your plan could not be generated right now. Your exam details are saved; try again."
        );
        return;
      }
      setResult({ plan: json.studyPlan, planId: json.planId, source: json.source });
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const totalTasks = result?.plan.days.reduce((s, d) => s + d.tasks.length, 0) ?? 0;
  const doneTasks = checked.length;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      {/* Input column */}
      <div className="space-y-4">
        <Card>
          <h2 className="text-base font-semibold text-ink">Plan inputs</h2>
          <p className="mt-0.5 mb-5 text-sm text-muted">
            Tell us your exam date, preparation level and available time.
          </p>
          <form onSubmit={generate} className="space-y-4">
            <Field label="Exam" required>
              <Select value={examId} onChange={(e) => selectExam(e.target.value)} required>
                {exams.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name} — {new Date(x.exam_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </option>
                ))}
              </Select>
            </Field>
            {exam && (
              <div className="flex flex-wrap gap-2">
                <Badge tone={daysRemaining <= 5 ? "danger" : "info"} icon="clock">
                  {daysRemaining < 0
                    ? "Exam date has passed"
                    : daysRemaining === 0
                      ? "Exam today"
                      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} remaining`}
                </Badge>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Hours / day" required hint="0.5 – 16">
                <Input type="number" min={0.5} max={16} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} required />
              </Field>
              <Field label="Preparation %" required>
                <Input type="number" min={0} max={100} step={1} value={prep} onChange={(e) => setPrep(e.target.value)} required />
              </Field>
            </div>
            <Field label="Syllabus / topics" hint="One per line.">
              <Textarea value={syllabus} onChange={(e) => setSyllabus(e.target.value)} placeholder={"Unit 1 — …\nUnit 2 — …"} />
            </Field>
            <Field label="Weak topics" hint="One per line. Planned first.">
              <Textarea value={weak} onChange={(e) => setWeak(e.target.value)} placeholder="e.g. Integration" />
            </Field>
            <FormError message={error} />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Icon name="spark" className="h-4 w-4" />
              {loading ? "Building your plan…" : emergency ? "Generate emergency plan" : "Build my study plan"}
            </Button>
          </form>
        </Card>

        {/* Emergency mode */}
        <div className={cx("rounded-2xl border p-5 transition-colors", emergency ? "border-danger/40 bg-red-50/60" : "border-line bg-surface")}>
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox checked={emergency} onChange={(e) => setEmergency(e.target.checked)} className="mt-0.5" aria-label="Activate Emergency Study Mode" />
            <span>
              <span className="flex items-center gap-1.5 text-base font-semibold text-ink">
                <Icon name="alert" className="h-4 w-4 text-danger" />
                Emergency Study Mode
              </span>
              <span className="mt-1 block text-sm text-muted">
                Short on time? Prioritize the work that matters most. The planner switches to a
                survival strategy for close exams.
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* Result column */}
      <div ref={resultRef} className="scroll-mt-20">
        {loading && (
          <Card className="py-10">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
                <Icon name="spark" className="h-6 w-6 animate-pulse-soft" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                Building a realistic plan around your available time…
              </h3>
              <p className="mt-1 text-sm text-muted" aria-live="polite">
                {LOADING_MESSAGES[loadingStep]}
              </p>
              <div className="mt-6 w-full max-w-md space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse-soft rounded-xl bg-slate-100" aria-hidden="true" />
                ))}
              </div>
            </div>
          </Card>
        )}

        {!loading && !result && !error && (
          <EmptyState
            icon="book"
            title="Your plan will appear here"
            body="Pick an exam, set your available time, and generate a day-by-day plan built around your real schedule."
          />
        )}

        {!loading && error && !result && (
          <Card>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-danger">
                <Icon name="alert" className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-ink">Plan generation failed</h3>
                <p className="mt-1 text-sm text-muted">{error}</p>
                <p className="mt-1 text-sm text-muted">Your inputs are preserved — adjust them and try again.</p>
              </div>
            </div>
          </Card>
        )}

        {!loading && result && (
          <div className="space-y-4">
            {result.source === "fallback" && (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-warning ring-1 ring-amber-600/25">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong className="font-semibold">Sample plan</strong> — no AI key is configured, so this
                  schedule was built by the built-in planner. Add{" "}
                  <code className="rounded bg-amber-100/60 px-1 font-mono text-xs">GOOGLE_GENERATIVE_AI_API_KEY</code>{" "}
                  for fully personalized AI plans.
                </span>
              </div>
            )}

            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={URGENCY_META[result.plan.urgency].tone} icon="alert">
                  {URGENCY_META[result.plan.urgency].label}
                </Badge>
                <Badge tone="neutral" icon="clock">
                  {result.plan.total_hours}h planned
                </Badge>
                <Badge tone="neutral" icon="calendar">
                  {result.plan.days.length} day{result.plan.days.length === 1 ? "" : "s"}
                </Badge>
                {result.source === "ai" && (
                  <Badge tone="info" icon="spark">
                    AI-generated
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink">{result.plan.summary}</p>
              {totalTasks > 0 && (
                <div className="mt-4">
                  <ProgressBar
                    value={(doneTasks / totalTasks) * 100}
                    tone="success"
                    label={`${doneTasks} of ${totalTasks} tasks complete`}
                  />
                </div>
              )}
            </Card>

            {/* Timeline */}
            <ol className="space-y-4">
              {result.plan.days.map((day, di) => (
                <li key={`${day.date}-${di}`}>
                  <Card>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold tracking-wider text-primary uppercase">
                          Day {di + 1} ·{" "}
                          {new Date(`${day.date}T00:00:00`).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <h3 className="mt-0.5 text-base font-semibold text-ink">{day.focus}</h3>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {day.tasks.map((task, ti) => {
                        const key = `${di}-${ti}`;
                        const isDone = checked.includes(key);
                        const meta = TYPE_META[task.type] ?? TYPE_META.learn;
                        return (
                          <li key={key}>
                            <label
                              className={cx(
                                "flex cursor-pointer items-start gap-3 rounded-xl border border-line px-3 py-2.5 transition-colors hover:bg-slate-50",
                                isDone && "opacity-60"
                              )}
                            >
                              <Checkbox checked={isDone} onChange={() => toggleTask(key)} className="mt-0.5" aria-label={task.title} />
                              <span className="min-w-0 flex-1">
                                <span className={cx("block text-sm font-medium text-ink", isDone && "line-through")}>
                                  {task.title}
                                </span>
                                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <Badge tone={meta.tone}>{meta.label}</Badge>
                                  <span className="text-xs text-muted">{task.duration_minutes} min</span>
                                  <span className="text-xs text-muted">· {task.priority} priority</span>
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </li>
              ))}
            </ol>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Icon name="checkCircle" className="h-5 w-5 text-success" />
                  Final revision
                </h3>
                <ul className="mt-3 space-y-2">
                  {result.plan.final_revision.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                  <Icon name="spark" className="h-5 w-5 text-primary" />
                  Tips
                </h3>
                <ul className="mt-3 space-y-2">
                  {result.plan.tips.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted">
                      <Icon name="chevronRight" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
