"use client";

import { useRef, useState, useTransition } from "react";
import { FEE_CATEGORIES } from "@/lib/validation";
import { createFee, deleteFee, setFeeStatus, updateFee } from "@/lib/actions";
import type { Fee, FeeCategory, FeeStatus } from "@/lib/types";
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
  toast,
} from "./ui";

const CATEGORY_LABEL: Record<FeeCategory, string> = {
  tuition: "Tuition",
  hostel: "Hostel",
  mess: "Mess",
  transport: "Transport",
  exam: "Exam",
  library: "Library",
  other: "Other",
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function toDateValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso).getTime() < today.getTime();
}

/* ------------------------- Receipt OCR (client-side) ------------------------ */

export interface ScanResult {
  text: string;
  amount: number | null;
  dueDate: string | null;
}

function parseAmount(text: string): number | null {
  // Numbers near money keywords score higher; otherwise take the largest sane number.
  const lines = text.split(/\n/);
  const candidates: { value: number; score: number }[] = [];
  const moneyWord = /(total|amount|grand|payable|balance|due|rs\.?|rs|inr|₹|fee)/i;
  for (const line of lines) {
    const near = moneyWord.test(line) ? 2 : 0;
    const matches = line.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/g) ?? [];
    for (const m of matches) {
      const value = Number(m);
      if (!Number.isFinite(value) || value <= 0 || value > 99999999) continue;
      if (value < 10 && near === 0) continue; // ignore stray small numbers
      candidates.push({ value, score: near + (value >= 100 ? 1 : 0) });
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  return (candidates[0] as { value: number }).value;
}

function parseDate(text: string): string | null {
  // Prefer ISO, else DD/MM/YYYY (Indian receipts).
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    if (!Number.isNaN(d.getTime())) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }
  const dmy = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (dmy) {
    let [, dd, mm, yyyy] = dmy;
    if (yyyy.length === 2) yyyy = `20${yyyy}`;
    const d = new Date(`${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00`);
    if (!Number.isNaN(d.getTime()) && Number(dd) <= 31 && Number(mm) <= 12) {
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
  }
  return null;
}

/** Runs Tesseract in the browser (loaded on demand). Never throws — returns null on failure. */
async function scanReceiptImage(file: File): Promise<ScanResult | null> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      const { data } = await worker.recognize(file);
      const text = (data.text ?? "").slice(0, 2000);
      if (text.trim().length < 3) return null;
      return { text, amount: parseAmount(text), dueDate: parseDate(text) };
    } finally {
      await worker.terminate().catch(() => undefined);
    }
  } catch {
    return null;
  }
}

/* --------------------------------- Dialog --------------------------------- */

function FeeDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Fee;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanNote, setScanNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    amount: initial ? String(initial.amount) : "",
    due_date: toDateValue(initial?.due_date ?? null),
    category: (initial?.category ?? "other") as FeeCategory,
    status: (initial?.status ?? "unpaid") as FeeStatus,
    notes: initial?.notes ?? "",
    receipt_text: initial?.receipt_text ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const scan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setScanNote(null);
    setScanning(true);
    try {
      const res = await scanReceiptImage(file);
      if (!res) {
        setScanNote("Couldn't read this image — enter the details manually.");
        return;
      }
      setForm((f) => ({
        ...f,
        amount: res.amount !== null ? String(res.amount) : f.amount,
        due_date: res.dueDate ?? f.due_date,
        receipt_text: res.text.slice(0, 2000),
      }));
      setScanNote(
        res.amount !== null || res.dueDate
          ? `Read from receipt: ${res.amount !== null ? inr(res.amount) : "no amount"}${res.dueDate ? ` · ${res.dueDate}` : ""}. Please verify.`
          : "Read some text but found no amount or date — please fill in manually."
      );
    } finally {
      setScanning(false);
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial ? await updateFee(initial.id, form) : await createFee(form);
      if (res.ok) {
        toast(initial ? "Fee updated." : "Fee added.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit fee" : "Track a fee"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl bg-canvas p-3">
          <input ref={fileRef} type="file" accept="image/*" onChange={scan} className="hidden" aria-label="Receipt photo" />
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} loading={scanning}>
            <Icon name="plus" className="h-4 w-4" />
            Scan receipt photo
          </Button>
          <p className="mt-1.5 text-xs text-muted">
            Optional: reads amount + date from a receipt photo on your device. Always verify — OCR misreads.
          </p>
          {scanNote && <p className="mt-1.5 text-xs font-medium text-ink">{scanNote}</p>}
        </div>
        <Field label="Title" required>
          <Input value={form.title} onChange={set("title")} placeholder="e.g. Semester 5 tuition" maxLength={120} required />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Amount (₹)" required>
            <Input type="number" min={0} step="any" value={form.amount} onChange={set("amount")} placeholder="0" required />
          </Field>
          <Field label="Due date">
            <Input type="date" value={form.due_date} onChange={set("due_date")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <Select value={form.category} onChange={set("category")}>
              {FEE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")}>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
            </Select>
          </Field>
        </div>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={set("notes")} placeholder="Receipt no., where to pay…" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add fee"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function FeeDialogButton({ label = "Track a fee" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <FeeDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ---------------------------------- Board ---------------------------------- */

function FeeCard({ fee }: { fee: Fee }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const paid = fee.status === "paid";
  const overdue = !paid && isOverdue(fee.due_date);

  const toggle = () => {
    startTransition(async () => {
      const res = await setFeeStatus(fee, paid ? "unpaid" : "paid");
      if (res.ok) toast(paid ? "Marked as unpaid." : "Marked as paid.");
      else toast(res.error, "error");
    });
  };

  const remove = () => {
    if (!confirm(`Delete “${fee.title}”?`)) return;
    startTransition(async () => {
      const res = await deleteFee(fee.id);
      if (res.ok) toast("Fee deleted.");
      else toast(res.error, "error");
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{fee.title}</p>
          <p className="text-lg font-bold text-ink">{inr(Number(fee.amount))}</p>
        </div>
        <Badge tone={paid ? "success" : overdue ? "danger" : "warning"}>{paid ? "Paid" : overdue ? "Overdue" : "Unpaid"}</Badge>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span>{CATEGORY_LABEL[fee.category]}</span>
        {formatDue(fee.due_date) && <span>Due {formatDue(fee.due_date)}</span>}
      </div>
      {fee.notes && <p className="mt-2 line-clamp-2 text-sm text-muted">{fee.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={toggle} loading={pending}>
          {paid ? "Mark unpaid" : "Mark paid"}
        </Button>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
          aria-label="Edit fee"
        >
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={remove}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-danger"
          aria-label="Delete fee"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
      <FeeDialog open={editOpen} onClose={() => setEditOpen(false)} initial={fee} />
    </Card>
  );
}

export function FeeBoard({ fees }: { fees: Fee[] }) {
  if (fees.length === 0) {
    return (
      <EmptyState
        icon="wallet"
        title="No fees tracked"
        body="Track tuition, hostel, mess and exam dues — scan a receipt to prefill."
      />
    );
  }
  const unpaid = fees.filter((f) => f.status !== "paid");
  const paid = fees.filter((f) => f.status === "paid");
  const byDue = (a: Fee, b: Fee) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  return (
    <div className="space-y-8">
      <section aria-label="Unpaid fees">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold">Unpaid</h2>
          <span className="text-xs text-muted">{unpaid.length}</span>
        </div>
        {unpaid.length === 0 ? (
          <p className="text-sm text-muted">All clear — nothing due.</p>
        ) : (
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[...unpaid].sort(byDue).map((f) => (
              <FeeCard key={f.id} fee={f} />
            ))}
          </div>
        )}
      </section>
      {paid.length > 0 && (
        <section aria-label="Paid fees">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Paid</h2>
            <span className="text-xs text-muted">{paid.length}</span>
          </div>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {paid.map((f) => (
              <FeeCard key={f.id} fee={f} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
