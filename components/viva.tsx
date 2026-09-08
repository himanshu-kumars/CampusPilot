"use client";

import { useState } from "react";
import { saveVivaSession } from "@/lib/actions";
import type { VivaTurn } from "@/lib/validation";
import {
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  ProgressBar,
  Select,
  Textarea,
  cx,
  toast,
} from "./ui";

export interface VivaExam {
  id: string;
  name: string;
  syllabus: string | null;
  weak_topics: string | null;
}

interface Pair {
  question: string;
  answer: string;
  feedback: string;
  score: number | null;
}

function Stars({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Score ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={cx("h-3.5 w-3.5", i <= score ? "fill-warning text-warning" : "fill-slate-200 text-slate-200")} aria-hidden="true">
          <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" />
        </svg>
      ))}
    </span>
  );
}

export function VivaManager({ exams }: { exams: VivaExam[] }) {
  const [examId, setExamId] = useState(exams[0]?.id ?? "");
  const [customTopic, setCustomTopic] = useState("");
  const [useCustom, setUseCustom] = useState(exams.length === 0);
  const [total, setTotal] = useState("5");
  const [phase, setPhase] = useState<"setup" | "live" | "done">("setup");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [currentQ, setCurrentQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [topic, setTopic] = useState("");

  const exam = exams.find((e) => e.id === examId);
  const context = exam
    ? [`Syllabus:\n${exam.syllabus || "(not provided)"}`, `Weak topics:\n${exam.weak_topics || "(none)"}`].join("\n\n")
    : "";

  const history = pairs.flatMap((p) => [
    { role: "ai" as const, content: p.question },
    { role: "student" as const, content: p.answer },
  ]);

  const callViva = async (payload: Record<string, unknown>): Promise<VivaTurn | null> => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/viva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success: true; turn: VivaTurn } | { success: false; error: string };
      if (!res.ok || !json.success) {
        setError((json as { error?: string }).error ?? "The examiner is unavailable. Try again.");
        return null;
      }
      return json.turn;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = useCustom ? customTopic.trim() : (exam?.name ?? "");
    if (!t) {
      setError(useCustom ? "Enter a topic first." : "Pick an exam first.");
      return;
    }
    setTopic(t);
    const turn = await callViva({ topic: t, context, history: [], questionNumber: 1, totalQuestions: Number(total) });
    if (!turn) return;
    setPairs([]);
    setCurrentQ(turn.next_question);
    setAnswer("");
    setSaved(false);
    setPhase("live");
  };

  const submitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim() || !currentQ) return;
    const qNum = pairs.length + 1;
    const turn = await callViva({
      topic,
      context,
      history,
      userAnswer: answer.trim(),
      questionNumber: qNum,
      totalQuestions: Number(total),
    });
    if (!turn) return; // error shown, answer preserved
    const newPairs = [...pairs, { question: currentQ, answer: answer.trim(), feedback: turn.feedback, score: turn.score }];
    setPairs(newPairs);
    setAnswer("");
    if (turn.done || newPairs.length >= Number(total)) {
      setCurrentQ("");
      setPhase("done");
    } else {
      setCurrentQ(turn.next_question);
    }
  };

  const scores = pairs.map((p) => p.score).filter((s): s is number => s !== null);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const save = async () => {
    const res = await saveVivaSession({
      exam_id: useCustom ? null : examId || null,
      topic,
      transcript: pairs.flatMap((p) => [
        { role: "ai", content: p.question },
        { role: "student", content: p.answer },
      ]),
      score: avg === null ? null : Math.round(avg),
    });
    if (res.ok) {
      setSaved(true);
      toast("Viva session saved.");
    } else {
      toast(res.error, "error");
    }
  };

  if (phase === "setup") {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Icon name="chat" className="h-5 w-5 text-primary" />
            Start a viva session
          </h2>
          <p className="mt-1 mb-5 text-sm text-muted">
            An AI examiner will ask oral-style questions, score your answers and probe your understanding.
          </p>
          <form onSubmit={start} className="space-y-4">
            {exams.length > 0 && (
              <Field label="Source">
                <Select value={useCustom ? "custom" : "exam"} onChange={(e) => setUseCustom(e.target.value === "custom")}>
                  <option value="exam">From an exam</option>
                  <option value="custom">Custom topic</option>
                </Select>
              </Field>
            )}
            {useCustom || exams.length === 0 ? (
              <Field label="Topic" required>
                <Input value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="e.g. Thermodynamics laws" maxLength={200} required />
              </Field>
            ) : (
              <Field label="Exam" required>
                <Select value={examId} onChange={(e) => setExamId(e.target.value)} required>
                  {exams.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Number of questions">
              <Select value={total} onChange={(e) => setTotal(e.target.value)}>
                <option value="3">3 (quick)</option>
                <option value="5">5 (standard)</option>
                <option value="8">8 (deep)</option>
              </Select>
            </Field>
            <FormError message={error} />
            <Button type="submit" fullWidth size="lg" loading={loading}>
              <Icon name="chat" className="h-4 w-4" />
              {loading ? "Calling the examiner…" : "Begin viva"}
            </Button>
          </form>
          <p className="mt-4 rounded-xl bg-indigo-50 px-3.5 py-2.5 text-xs text-primary ring-1 ring-indigo-600/20">
            Viva practice needs an AI key — it&apos;s a live conversation, not a template.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-ink">{topic}</h2>
          <p className="text-sm text-muted">
            {phase === "done" ? "Session complete" : `Question ${pairs.length + 1} of ${total}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setPhase("setup")}>
          {phase === "done" ? "New session" : "End early"}
        </Button>
      </div>

      <ProgressBar value={(pairs.length / Number(total)) * 100} label={`${pairs.length} of ${total} answered`} />

      <div className="space-y-3">
        {pairs.map((p, i) => (
          <div key={i} className="space-y-2">
            <div className="rounded-2xl rounded-tl-md bg-canvas p-4">
              <p className="text-xs font-bold tracking-wider text-muted uppercase">Examiner · Q{i + 1}</p>
              <p className="mt-1 text-sm font-medium text-ink">{p.question}</p>
            </div>
            <div className="ml-8 rounded-2xl rounded-tr-md bg-indigo-50 p-4 ring-1 ring-indigo-600/10">
              <p className="text-xs font-bold tracking-wider text-primary uppercase">You</p>
              <p className="mt-1 text-sm text-ink">{p.answer}</p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold tracking-wider text-muted uppercase">Feedback</p>
                <Stars score={p.score} />
              </div>
              <p className="mt-1 text-sm text-muted">{p.feedback}</p>
            </div>
          </div>
        ))}

        {phase === "live" && currentQ && (
          <div className="rounded-2xl rounded-tl-md bg-canvas p-4">
            <p className="text-xs font-bold tracking-wider text-muted uppercase">
              Examiner · Q{pairs.length + 1}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{currentQ}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 rounded-2xl bg-canvas p-4 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary" />
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary" style={{ animationDelay: "200ms" }} />
            <span className="h-2 w-2 animate-pulse-soft rounded-full bg-primary" style={{ animationDelay: "400ms" }} />
            The examiner is thinking…
          </div>
        )}
      </div>

      {phase === "live" ? (
        <Card>
          <form onSubmit={submitAnswer} className="space-y-3">
            <Field label="Your answer" required>
              <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer as you would speak it…" rows={3} required />
            </Field>
            <FormError message={error} />
            <Button type="submit" fullWidth loading={loading} disabled={!answer.trim()}>
              Submit answer
            </Button>
          </form>
        </Card>
      ) : (
        <Card className="text-center">
          <h3 className="text-base font-semibold text-ink">Session complete</h3>
          {avg !== null ? (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Stars score={Math.round(avg)} />
              <span className="text-sm text-muted">Average {avg.toFixed(1)} / 5</span>
            </div>
          ) : (
            <p className="mt-1 text-sm text-muted">No scored answers this time.</p>
          )}
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {avg !== null && avg >= 4
              ? "Strong viva performance — you explain concepts clearly."
              : avg !== null && avg >= 2.5
                ? "Decent foundation — tighten definitions and practice follow-ups."
                : "Good practice — re-read the material and try another round."}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => setPhase("setup")}>
              New session
            </Button>
            <Button onClick={save} disabled={saved}>
              {saved ? "Saved" : "Save session"}
            </Button>
          </div>
        </Card>
      )}

      {pairs.length === 0 && phase === "live" && !currentQ && !loading && (
        <EmptyState icon="chat" title="Session stalled" body="The examiner didn't respond. Go back and start a new session." />
      )}
    </div>
  );
}

