"use client";

import { useState, useTransition } from "react";
import { deletePracticeSet, recordPracticeAttempt } from "@/lib/actions";
import type { PracticeSet } from "@/lib/types";
import { practiceQuestionSchema, type PracticeQuestion } from "@/lib/validation";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  FormError,
  Icon,
  ProgressBar,
  Select,
  Input,
  cx,
  toast,
} from "./ui";

export interface QuizState {
  title: string;
  questions: PracticeQuestion[];
  setId: string | null;
  source: "ai" | "fallback";
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shortCorrect(typed: string, answer: string): boolean {
  const t = normalize(typed);
  const a = normalize(answer);
  if (!t || !a) return false;
  if (t === a) return true;
  if (t.length >= 4 && (a.includes(t) || t.includes(a))) return true;
  const words = a.split(" ").filter((w) => w.length > 3);
  if (words.length === 0) return false;
  const hit = words.filter((w) => t.includes(w)).length;
  return hit / words.length >= 0.6;
}

interface AnswerLog {
  question: string;
  yours: string;
  answer: string;
  explanation: string;
  correct: boolean;
}

export function QuizRunner({ quiz, onExit }: { quiz: QuizState; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState("");
  const [typed, setTyped] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [log, setLog] = useState<AnswerLog[]>([]);
  const [finished, setFinished] = useState(false);
  const [, startRecord] = useTransition();

  const q = quiz.questions[index] as PracticeQuestion;
  const isMcq = q.type === "mcq" && (q.options?.length ?? 0) > 0;
  const yourAnswer = isMcq ? picked : typed;
  const correct = isMcq ? picked === q.answer : shortCorrect(typed, q.answer);

  const check = () => {
    if (revealed || !yourAnswer) return;
    setRevealed(true);
    if (correct) setScore((s) => s + 1);
    setLog((l) => [...l, { question: q.question, yours: yourAnswer, answer: q.answer, explanation: q.explanation, correct }]);
  };

  const next = () => {
    if (index + 1 >= quiz.questions.length) {
      setFinished(true);
      if (quiz.setId) {
        const finalScore = score; // score already includes current question
        startRecord(async () => {
          await recordPracticeAttempt(quiz.setId as string, finalScore, quiz.questions.length);
        });
      }
    } else {
      setIndex((i) => i + 1);
      setPicked("");
      setTyped("");
      setRevealed(false);
    }
  };

  if (finished) {
    const pct = Math.round((score / quiz.questions.length) * 100);
    return (
      <div className="space-y-4">
        <Card className="text-center">
          <p className="text-sm font-semibold tracking-wide text-muted uppercase">Your score</p>
          <p className="mt-1 text-5xl font-bold tracking-tight text-ink">
            {score}
            <span className="text-2xl text-muted">/{quiz.questions.length}</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {pct >= 80 ? "Excellent — exam ready on this material." : pct >= 50 ? "Solid progress — review the misses below." : "Good effort — re-read the material and try again."}
          </p>
          <div className="mx-auto mt-4 max-w-xs">
            <ProgressBar value={pct} tone={pct >= 80 ? "success" : pct >= 50 ? "warning" : "danger"} />
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <Button variant="secondary" onClick={onExit}>
              Back to practice
            </Button>
            <Button
              onClick={() => {
                setIndex(0);
                setPicked("");
                setTyped("");
                setRevealed(false);
                setScore(0);
                setLog([]);
                setFinished(false);
              }}
            >
              Retry
            </Button>
          </div>
        </Card>
        <Card>
          <h3 className="text-base font-semibold text-ink">Review</h3>
          <ul className="mt-3 space-y-3">
            {log.map((l, i) => (
              <li key={i} className="rounded-xl bg-canvas p-3.5 text-sm">
                <p className="font-semibold text-ink">
                  {i + 1}. {l.question}
                </p>
                <p className={cx("mt-1", l.correct ? "text-success" : "text-danger")}>
                  Your answer: {l.yours || "—"} {l.correct ? "· Correct" : "· Incorrect"}
                </p>
                {!l.correct && (
                  <p className="mt-0.5 text-ink">
                    Correct answer: <span className="font-medium">{l.answer}</span>
                  </p>
                )}
                <p className="mt-0.5 text-muted">{l.explanation}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted">
          Question {index + 1} of {quiz.questions.length}
        </p>
        <Button variant="ghost" size="sm" onClick={onExit}>
          Exit quiz
        </Button>
      </div>
      <ProgressBar value={(index / quiz.questions.length) * 100} label={`Score so far: ${score}`} />
      <h3 className="mt-4 text-lg font-semibold text-ink">{q.question}</h3>

      {isMcq ? (
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Answer options">
          {(q.options ?? []).map((opt, i) => {
            const isAnswer = revealed && opt === q.answer;
            const isWrongPick = revealed && opt === picked && opt !== q.answer;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={picked === opt}
                disabled={revealed}
                onClick={() => setPicked(opt)}
                className={cx(
                  "flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors disabled:cursor-default",
                  isAnswer && "border-success bg-emerald-50 font-semibold text-ink",
                  isWrongPick && "border-danger bg-red-50 text-ink",
                  !revealed && picked === opt && "border-primary bg-indigo-50 text-ink",
                  !revealed && picked !== opt && "border-line bg-surface text-ink hover:bg-slate-50",
                  revealed && !isAnswer && !isWrongPick && "border-line text-muted"
                )}
              >
                <span
                  className={cx(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1",
                    isAnswer ? "bg-success text-white ring-success" : "bg-surface text-muted ring-line"
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={revealed}
            placeholder="Type your answer…"
            aria-label="Your answer"
          />
        </div>
      )}

      {revealed && (
        <div
          className={cx(
            "mt-4 rounded-xl px-4 py-3 text-sm ring-1",
            correct ? "bg-emerald-50 text-ink ring-emerald-600/20" : "bg-red-50 text-ink ring-red-600/20"
          )}
        >
          <p className="font-semibold">{correct ? "Correct." : "Not quite."}</p>
          <p className="mt-1">
            Answer: <span className="font-medium">{q.answer}</span>
          </p>
          <p className="mt-1 text-muted">{q.explanation}</p>
        </div>
      )}

      <div className="mt-5 flex gap-3">
        {!revealed ? (
          <Button fullWidth onClick={check} disabled={!yourAnswer}>
            Check answer
          </Button>
        ) : (
          <Button fullWidth onClick={next}>
            {index + 1 >= quiz.questions.length ? "See results" : "Next question"}
            <Icon name="chevronRight" className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}

export function PracticeManager({
  exams,
  notes,
  sets,
  preset,
}: {
  exams: { id: string; name: string }[];
  notes: { id: string; title: string }[];
  sets: PracticeSet[];
  preset?: { examId?: string; noteId?: string };
}) {
  const initialSource = preset?.noteId ? "note" : "exam";
  const [source, setSource] = useState<"exam" | "note">(initialSource);
  const [sourceId, setSourceId] = useState(preset?.noteId ?? preset?.examId ?? "");
  const [count, setCount] = useState("8");
  const [difficulty, setDifficulty] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [deleting, startDelete] = useTransition();

  const hasSources = exams.length > 0 || notes.length > 0;

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!sourceId) {
      setError(source === "exam" ? "Pick an exam first." : "Pick a note first.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(source === "exam" ? { examId: sourceId } : { noteId: sourceId }),
          count: Number(count),
          difficulty,
        }),
      });
      const json = (await res.json()) as
        | { success: true; setId: string | null; questions: PracticeQuestion[]; source: "ai" | "fallback" }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        setError((json as { error?: string }).error ?? "Could not generate questions.");
        return;
      }
      const name =
        source === "exam"
          ? (exams.find((x) => x.id === sourceId)?.name ?? "Exam")
          : (notes.find((x) => x.id === sourceId)?.title ?? "Notes");
      setQuiz({ title: name, questions: json.questions, setId: json.setId, source: json.source });
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setGenerating(false);
    }
  };

  const retake = (set: PracticeSet) => {
    const parsed = practiceQuestionSchema.array().safeParse(set.questions);
    if (!parsed.success || parsed.data.length === 0) {
      toast("This set can't be opened.", "error");
      return;
    }
    setQuiz({ title: set.title, questions: parsed.data, setId: set.id, source: "ai" });
  };

  const remove = (set: PracticeSet) => {
    startDelete(async () => {
      const res = await deletePracticeSet(set.id);
      if (!res.ok) toast(res.error, "error");
      else toast("Practice set deleted.");
    });
  };

  if (quiz) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="truncate text-lg font-semibold text-ink">{quiz.title}</h2>
          {quiz.source === "fallback" ? (
            <Badge tone="warning">Sample questions</Badge>
          ) : (
            <Badge tone="info" icon="spark">
              AI-generated
            </Badge>
          )}
        </div>
        {quiz.source === "fallback" && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-warning ring-1 ring-amber-600/25">
            Sample questions built from your notes without AI. Add an AI key for full MCQs and explanations.
          </p>
        )}
        <QuizRunner quiz={quiz} onExit={() => setQuiz(null)} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card>
        <h2 className="text-base font-semibold text-ink">New practice set</h2>
        <p className="mt-0.5 mb-5 text-sm text-muted">Generate exam-style questions from your material.</p>
        {!hasSources ? (
          <EmptyState
            icon="tasks"
            title="Nothing to practice yet"
            body="Add an exam or some notes first."
            action={<ButtonLink href="/exams">Go to exams</ButtonLink>}
          />
        ) : (
          <form onSubmit={generate} className="space-y-4">
            <Field label="Source">
              <Select value={source} onChange={(e) => { setSource(e.target.value as "exam" | "note"); setSourceId(""); }}>
                <option value="exam">Exam syllabus</option>
                <option value="note">Saved notes</option>
              </Select>
            </Field>
            <Field label={source === "exam" ? "Exam" : "Note"} required>
              <Select value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
                <option value="">Choose…</option>
                {(source === "exam" ? exams : notes).map((s) => (
                  <option key={s.id} value={s.id}>
                    {"name" in s ? s.name : s.title}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Questions">
                <Select value={count} onChange={(e) => setCount(e.target.value)}>
                  <option value="5">5</option>
                  <option value="8">8</option>
                  <option value="12">12</option>
                </Select>
              </Field>
              <Field label="Difficulty">
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="mixed">Mixed</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </Field>
            </div>
            <FormError message={error} />
            <Button type="submit" fullWidth loading={generating}>
              <Icon name="spark" className="h-4 w-4" />
              {generating ? "Setting questions…" : "Generate questions"}
            </Button>
          </form>
        )}
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold text-ink">Your practice sets</h2>
        {sets.length === 0 ? (
          <EmptyState
            icon="checkCircle"
            title="No practice sets yet"
            body="Generate your first set to start testing yourself."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sets.map((s) => {
              const n = Array.isArray(s.questions) ? s.questions.length : 0;
              return (
                <Card key={s.id} className="p-4">
                  <h3 className="truncate text-sm font-semibold text-ink">{s.title}</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {n} questions · {s.difficulty} ·{" "}
                    {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone={s.best_score !== null ? "success" : "neutral"}>
                      {s.best_score !== null ? `Best: ${s.best_score}/${n}` : "Not attempted"}
                    </Badge>
                    {s.attempts > 0 && <span className="text-xs text-muted">{s.attempts} attempt{s.attempts === 1 ? "" : "s"}</span>}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => retake(s)}>
                      {s.attempts > 0 ? "Retry" : "Start"}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={deleting} onClick={() => remove(s)} aria-label={`Delete ${s.title}`}>
                      <Icon name="trash" className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

