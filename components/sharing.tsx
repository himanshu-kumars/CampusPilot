"use client";

import { useEffect, useState, useTransition } from "react";
import { createShareLink, importSubjectsCSV, revokeShareLink } from "@/lib/actions";
import type { ShareLink } from "@/lib/types";
import {
  Button,
  Card,
  Field,
  FormError,
  Icon,
  Input,
  Select,
  toast,
} from "./ui";

export function ShareManager({ links }: { links: ShareLink[] }) {
  const [origin, setOrigin] = useState("");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState("14");
  const [error, setError] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
  const [fresh, setFresh] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFresh(null);
    startCreate(async () => {
      const res = await createShareLink({ label, days: Number(days) });
      if (res.ok) {
        setFresh(res.data);
        setLabel("");
        toast("Share link created.");
      } else setError(res.error);
    });
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}/share/${token}`);
      toast("Link copied.");
    } catch {
      toast("Copy failed — select the link manually.", "error");
    }
  };

  const revoke = async (id: string) => {
    const res = await revokeShareLink(id);
    if (res.ok) toast("Link revoked.");
    else toast(res.error, "error");
  };

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
        <Icon name="users" className="h-5 w-5 text-primary" />
        Mentor sharing
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted">
        Create a read-only progress report link for a mentor, parent or friend. They see attendance,
        deadlines and readiness — never your login, notes or AI chats.
      </p>

      {fresh && origin && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-600/20">
          <p className="text-xs font-bold tracking-wider text-success uppercase">New link — copy it now</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">{`${origin}/share/${fresh}`}</code>
            <Button size="sm" variant="secondary" onClick={() => copy(fresh)}>
              Copy
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="grid gap-3 sm:grid-cols-[1fr_140px_auto]">
        <Field label="Label">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. For Prof. Rao" maxLength={60} />
        </Field>
        <Field label="Expires">
          <Select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="0">Never</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={creating}>
            <Icon name="plus" className="h-4 w-4" />
            Create link
          </Button>
        </div>
      </form>
      <FormError message={error} />

      {links.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {links.map((l) => (
            <li key={l.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{l.label || "Untitled link"}</span>
                <span className="block text-xs text-muted">
                  Created {new Date(l.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  {l.expires_at ? ` · Expires ${new Date(l.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : " · Never expires"}
                </span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => copy(l.token)}>
                Copy
              </Button>
              <Button size="sm" variant="ghost" onClick={() => revoke(l.id)} aria-label="Revoke link">
                <Icon name="trash" className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const CSV_TEMPLATE = "name,attended,total,target\nMathematics-I,18,24,75\nDigital Electronics,17,25,75\n";

export function ImportExport() {
  const [pending, startImport] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "campuspilot-subjects-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = (formData: FormData) => {
    setError(null);
    setResult(null);
    startImport(async () => {
      const res = await importSubjectsCSV(formData);
      if (res.ok) {
        setResult(res.data);
        toast(`Imported ${res.data.added} subject${res.data.added === 1 ? "" : "s"}.`);
      } else setError(res.error);
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <h2 className="text-base font-semibold text-ink">Import subjects</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Bring data from a spreadsheet: columns <code className="rounded bg-slate-100 px-1 font-mono text-xs">name,attended,total,target</code>.
        </p>
        <form action={onImport} className="space-y-3">
          <Field label="CSV file" required>
            <Input type="file" name="file" accept=".csv,text/csv" required />
          </Field>
          <FormError message={error} />
          {result && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-success ring-1 ring-emerald-600/20">
              Added {result.added}, skipped {result.skipped} invalid row{result.skipped === 1 ? "" : "s"}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={pending}>
              Import CSV
            </Button>
            <Button type="button" variant="secondary" onClick={downloadTemplate}>
              Template
            </Button>
          </div>
        </form>
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-ink">Export everything</h2>
        <p className="mt-1 mb-3 text-sm text-muted">
          Download all your subjects, assignments, exams, notes, timetable and activity as one JSON file. Your data stays portable.
        </p>
        <a
          href="/api/export"
          download="campuspilot-export.json"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <Icon name="checkCircle" className="h-4 w-4" />
          Download export
        </a>
      </Card>
    </div>
  );
}
