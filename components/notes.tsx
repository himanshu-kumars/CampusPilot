"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { createNoteText, deleteNote, uploadNote } from "@/lib/actions";
import type { Note, Subject } from "@/lib/types";
import { noteSummarySchema, type NoteSummary } from "@/lib/validation";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  Modal,
  Select,
  Textarea,
  cx,
  toast,
} from "./ui";

function parseSummary(raw: unknown): NoteSummary | null {
  if (!raw) return null;
  const parsed = noteSummarySchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function SummaryView({ summary, source }: { summary: NoteSummary; source: "ai" | "fallback" | null }) {
  return (
    <div className="space-y-4">
      {source === "fallback" && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-warning ring-1 ring-amber-600/25">
          Sample summary built without AI. Add an AI key for full summaries with key terms.
        </p>
      )}
      <div>
        <h4 className="text-sm font-semibold text-ink">Summary</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted">{summary.summary}</p>
      </div>
      {summary.key_points.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Key points</h4>
          <ul className="mt-1.5 space-y-1.5">
            {summary.key_points.map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.terms.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Important terms</h4>
          <dl className="mt-1.5 space-y-1.5">
            {summary.terms.map((t, i) => (
              <div key={i} className="rounded-lg bg-canvas px-3 py-2 text-sm">
                <dt className="font-semibold text-ink">{t.term}</dt>
                <dd className="text-muted">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {summary.suggested_questions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Test yourself</h4>
          <ul className="mt-1.5 space-y-1.5">
            {summary.suggested_questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted">
                <Icon name="chevronRight" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  subjectName,
  summary,
  summarize,
  summarizing,
}: {
  note: Note;
  subjectName: string | null;
  summary: { data: NoteSummary; source: "ai" | "fallback" } | null;
  summarize: () => void;
  summarizing: boolean;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const onDelete = () => {
    startTransition(async () => {
      const res = await deleteNote(note.id);
      if (res.ok) toast("Note deleted.");
      else toast(res.error, "error");
    });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{note.title}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {subjectName ?? "No subject"} ·{" "}
            {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {note.file_name ? ` · ${note.file_name}` : ""}
          </p>
        </div>
        {summary ? (
          <Badge tone="success" icon="checkCircle">
            Summarized
          </Badge>
        ) : (
          <Badge tone="neutral">No summary</Badge>
        )}
      </div>
      <p className="mt-3 line-clamp-3 text-sm text-muted">{note.content_text.slice(0, 280)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setViewOpen(true)}>
          <Icon name="book" className="h-4 w-4" />
          Open
        </Button>
        <Link
          href={`/practice?note=${note.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-indigo-50"
        >
          <Icon name="checkCircle" className="h-4 w-4" />
          Quiz me
        </Link>
        <span className="flex-1" />
        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${note.title}`}
            className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger"
          >
            <Icon name="trash" className="h-4 w-4" />
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="cursor-pointer rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Deleting…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-muted hover:bg-slate-100"
            >
              Cancel
            </button>
          </span>
        )}
      </div>

      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={note.title} wide>
        <div className="space-y-5">
          <div className="max-h-56 overflow-y-auto rounded-xl bg-canvas p-4 text-sm leading-relaxed whitespace-pre-wrap text-ink">
            {note.content_text}
          </div>
          {summary ? (
            <SummaryView summary={summary.data} source={summary.source} />
          ) : (
            <div className="rounded-xl border border-dashed border-line p-5 text-center">
              <p className="text-sm text-muted">No summary yet. Generate one to get key points, terms and self-test questions.</p>
              <div className="mt-3">
                <Button size="sm" onClick={summarize} loading={summarizing}>
                  <Icon name="spark" className="h-4 w-4" />
                  Summarize these notes
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
}

export function NotesManager({ notes, subjects }: { notes: Note[]; subjects: Subject[] }) {
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [paste, setPaste] = useState({ title: "", subject_id: "", content_text: "" });
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasting, startPaste] = useTransition();
  const [summaries, setSummaries] = useState<Record<string, { data: NoteSummary; source: "ai" | "fallback" }>>(() => {
    const init: Record<string, { data: NoteSummary; source: "ai" | "fallback" }> = {};
    for (const n of notes) {
      const s = parseSummary(n.summary);
      if (s) init[n.id] = { data: s, source: s.terms.length === 0 && s.summary.startsWith("Sample summary") ? "fallback" : "ai" };
    }
    return init;
  });
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const onUpload = (formData: FormData) => {
    setUploadError(null);
    startUpload(async () => {
      const res = await uploadNote(formData);
      if (res.ok) {
        toast("Note uploaded.");
        formRef.current?.reset();
      } else {
        setUploadError(res.error);
      }
    });
  };

  const onPaste = (e: React.FormEvent) => {
    e.preventDefault();
    setPasteError(null);
    startPaste(async () => {
      const res = await createNoteText(paste);
      if (res.ok) {
        toast("Note saved.");
        setPaste({ title: "", subject_id: "", content_text: "" });
        setPasteOpen(false);
      } else {
        setPasteError(res.error);
      }
    });
  };

  const summarize = async (note: Note) => {
    setSummarizingId(note.id);
    try {
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id }),
      });
      const json = (await res.json()) as
        | { success: true; summary: NoteSummary; source: "ai" | "fallback" }
        | { success: false; error: string };
      if (!res.ok || !json.success) {
        toast((json as { error?: string }).error ?? "Could not summarize these notes.", "error");
        return;
      }
      setSummaries((s) => ({ ...s, [note.id]: { data: json.summary, source: json.source } }));
      toast("Summary ready.");
    } catch {
      toast("Could not reach the server.", "error");
    } finally {
      setSummarizingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-base font-semibold text-ink">Upload notes</h2>
          <p className="mt-0.5 mb-4 text-sm text-muted">PDF or text files, up to 5 MB.</p>
          <form ref={formRef} action={onUpload} className="space-y-4">
            <Field label="File" required>
              <Input type="file" name="file" accept=".pdf,.txt,.md,text/plain,application/pdf" required />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Title" hint="Defaults to file name.">
                <Input name="title" placeholder="e.g. Thermodynamics ch. 4" maxLength={120} />
              </Field>
              <Field label="Subject">
                <Select name="subject_id" defaultValue="">
                  <option value="">No subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <FormError message={uploadError} />
            <Button type="submit" loading={uploading}>
              Upload & save
            </Button>
          </form>
        </Card>
        <Card className="flex flex-col items-start justify-center">
          <h2 className="text-base font-semibold text-ink">Or paste text</h2>
          <p className="mt-1 mb-4 text-sm text-muted">
            Copy notes from anywhere — a PDF that won&apos;t upload, a web page, your own revision sheet.
          </p>
          <Button variant="secondary" onClick={() => setPasteOpen(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Paste notes
          </Button>
        </Card>
      </div>

      {notes.length === 0 ? (
        <EmptyState
          icon="book"
          title="No notes yet"
          body="Upload a PDF or paste text, then summarize it and turn it into practice questions."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              subjectName={n.subject_id ? (subjects.find((s) => s.id === n.subject_id)?.name ?? "Unknown") : null}
              summary={summaries[n.id] ?? null}
              summarize={() => summarize(n)}
              summarizing={summarizingId === n.id}
            />
          ))}
        </div>
      )}

      <Modal open={pasteOpen} onClose={() => setPasteOpen(false)} title="Paste notes" wide>
        <form onSubmit={onPaste} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required>
              <Input value={paste.title} onChange={(e) => setPaste((p) => ({ ...p, title: e.target.value }))} required maxLength={120} />
            </Field>
            <Field label="Subject">
              <Select value={paste.subject_id} onChange={(e) => setPaste((p) => ({ ...p, subject_id: e.target.value }))}>
                <option value="">No subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes" required>
            <Textarea
              value={paste.content_text}
              onChange={(e) => setPaste((p) => ({ ...p, content_text: e.target.value }))}
              required
              rows={10}
              placeholder="Paste your notes here…"
              className={cx("min-h-48")}
            />
          </Field>
          <FormError message={pasteError} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={pasting}>
              Save notes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
