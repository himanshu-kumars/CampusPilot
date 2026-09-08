"use client";

import { useState, useTransition } from "react";
import { deletePracticeSet } from "@/lib/actions";
import type { PracticeSet } from "@/lib/types";
import {
  PLACEMENT_TRACKS,
  TRACK_META,
  practiceQuestionSchema,
  type PlacementTrack,
  type PracticeQuestion,
} from "@/lib/validation";
import { QuizRunner, type QuizState } from "./practice";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  Select,
  cx,
  toast,
} from "./ui";

type GenResponse =
  | { success: true; setId: string | null; questions: PracticeQuestion[]; source: "ai" | "fallback" }
  | { success: false; error: string };

export function PlacementManager({ sets }: { sets: PracticeSet[] }) {
  const [track, setTrack] = useState<PlacementTrack>("quant");
  const [count, setCount] = useState("8");
  const [difficulty, setDifficulty] = useState("mixed");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [, startDelete] = useTransition();

  const history = sets.filter((s) => s.title.startsWith("Placement:"));

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, count: Number(count), difficulty }),
      });
      const json = (await res.json()) as GenResponse;
      if (!res.ok || !json.success) {
        setError((json as { error?: string }).error ?? "Could not generate questions.");
        return;
      }
      setQuiz({
        title: TRACK_META[track].label,
        questions: json.questions,
        setId: json.setId,
        source: json.source,
      });
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
    setQuiz({ title: set.title.replace(/^Placement: /, ""), questions: parsed.data, setId: set.id, source: "ai" });
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
          <Badge tone="info" icon="spark">
            AI-generated
          </Badge>
        </div>
        <QuizRunner quiz={quiz} onExit={() => setQuiz(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-base font-semibold text-ink">Pick a track</h2>
        <p className="mt-0.5 mb-4 text-sm text-muted">
          AI generates a placement-style set. Attempts and best scores are saved.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="radiogroup" aria-label="Placement track">
          {PLACEMENT_TRACKS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={track === t}
              onClick={() => setTrack(t)}
              className={cx(
                "rounded-xl border px-3 py-2.5 text-left transition-colors",
                track === t
                  ? "border-primary bg-indigo-50 ring-1 ring-primary"
                  : "border-line bg-surface hover:bg-slate-50"
              )}
            >
              <span className="block text-sm font-semibold text-ink">{TRACK_META[t].label}</span>
              <span className="mt-0.5 block text-xs leading-snug text-muted">{TRACK_META[t].blurb}</span>
            </button>
          ))}
        </div>
        <form onSubmit={generate} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Questions (3–15)">
            <Input
              type="number"
              min={3}
              max={15}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="sm:w-28"
            />
          </Field>
          <Field label="Difficulty">
            <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="sm:w-36">
              <option value="mixed">Mixed</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </Field>
          <Button type="submit" loading={generating}>
            <Icon name="spark" className="h-4 w-4" />
            Generate set
          </Button>
        </form>
        <FormError message={error} />
      </Card>

      <section aria-label="Placement history">
        <h2 className="mb-3 text-base font-semibold text-ink">Your placement sets</h2>
        {history.length === 0 ? (
          <EmptyState icon="cap" title="No placement sets yet" body="Generate your first set above — aptitude, DSA, HR and more." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {history.map((s) => {
              const n = Array.isArray(s.questions) ? s.questions.length : 0;
              return (
                <li key={s.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-ink">{s.title}</p>
                      <Badge tone={s.best_score !== null ? "success" : "neutral"}>
                        {s.best_score !== null ? `Best: ${s.best_score}/${n}` : "Not attempted"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {s.attempts} attempt{s.attempts === 1 ? "" : "s"} · {s.difficulty}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button variant="secondary" onClick={() => retake(s)}>
                        {s.attempts > 0 ? "Retake" : "Start"}
                      </Button>
                      <span className="flex-1" />
                      <button
                        type="button"
                        onClick={() => remove(s)}
                        className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-danger"
                        aria-label="Delete set"
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------------------- Static interview checklist ---------------------- */

const CHECKLIST: { title: string; points: string[] }[] = [
  {
    title: "Before the interview",
    points: [
      "Research the company: product, customers, recent news, and the exact role.",
      "Prepare your 90-second intro: present situation, relevant proof, why this role.",
      "Revise your resume line by line — every project, number, and claimed skill is fair game.",
      "Prepare 2–3 questions to ask them; 'no questions' reads as disinterest.",
    ],
  },
  {
    title: "During the interview",
    points: [
      "Think out loud while solving — interviewers score approach, not just answers.",
      "Clarify constraints before coding; restate the problem in your own words.",
      "Use STAR (Situation, Task, Action, Result) for every behavioral answer.",
      "If stuck, say so and ask for a hint — silence is worse than struggling.",
    ],
  },
  {
    title: "After the interview",
    points: [
      "Write down every question asked within an hour — it compounds across companies.",
      "Send a short thank-you note within 24 hours, referencing something specific.",
      "Note what wobbled and drill it before the next one — one fix per interview.",
    ],
  },
];

export function InterviewChecklist() {
  return (
    <section aria-label="Interview checklist" className="mt-8">
      <h2 className="mb-3 text-base font-semibold text-ink">Interview checklist</h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {CHECKLIST.map((c) => (
          <Card key={c.title}>
            <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
            <ul className="mt-3 space-y-2.5">
              {c.points.map((p) => (
                <li key={p} className="flex gap-2 text-sm text-muted">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
