"use client";

import { useState, useTransition } from "react";
import { INTERNSHIP_STATUSES } from "@/lib/validation";
import { createInternship, deleteInternship, setInternshipStatus, updateInternship } from "@/lib/actions";
import type { Internship, InternshipStatus } from "@/lib/types";
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

const STATUS_LABEL: Record<InternshipStatus, string> = {
  wishlist: "Wishlist",
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  accepted: "Accepted",
  rejected: "Rejected",
};

const STATUS_TONE: Record<InternshipStatus, "neutral" | "info" | "warning" | "success" | "danger"> = {
  wishlist: "neutral",
  applied: "info",
  screening: "warning",
  interview: "warning",
  offer: "success",
  accepted: "success",
  rejected: "danger",
};

/** Active pipeline order; accepted/rejected live in the "Closed" column. */
const PIPELINE: InternshipStatus[] = ["wishlist", "applied", "screening", "interview", "offer"];
const CLOSED: InternshipStatus[] = ["accepted", "rejected"];

function toDateValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function formatDeadline(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso + (iso.length === 10 ? "T00:00:00" : "")).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(iso).getTime() < today.getTime();
}

function normalizeLink(link: string | null): string | null {
  if (!link) return null;
  const t = link.trim();
  if (!t) return null;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}

/* --------------------------------- Dialog --------------------------------- */

function InternshipDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Internship;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    company: initial?.company ?? "",
    role: initial?.role ?? "",
    status: (initial?.status ?? "wishlist") as InternshipStatus,
    deadline: toDateValue(initial?.deadline ?? null),
    link: initial?.link ?? "",
    location: initial?.location ?? "",
    stipend: initial?.stipend ?? "",
    notes: initial?.notes ?? "",
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial
        ? await updateInternship(initial.id, form)
        : await createInternship(form);
      if (res.ok) {
        toast(initial ? "Application updated." : "Application added.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit application" : "Track application"}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company" required>
            <Input value={form.company} onChange={set("company")} placeholder="e.g. Acme Corp" maxLength={120} required />
          </Field>
          <Field label="Role" required>
            <Input value={form.role} onChange={set("role")} placeholder="e.g. SDE Intern" maxLength={120} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Stage">
            <Select value={form.status} onChange={set("status")}>
              {INTERNSHIP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Deadline">
            <Input type="date" value={form.deadline} onChange={set("deadline")} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <Input value={form.location} onChange={set("location")} placeholder="e.g. Remote / Bengaluru" maxLength={120} />
          </Field>
          <Field label="Stipend">
            <Input value={form.stipend} onChange={set("stipend")} placeholder="e.g. ₹30k/month" maxLength={60} />
          </Field>
        </div>
        <Field label="Posting link">
          <Input value={form.link} onChange={set("link")} placeholder="https://…" maxLength={500} />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={set("notes")} placeholder="Referral, OA date, interviewer…" />
        </Field>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Add application"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function InternshipDialogButton({ label = "Track application" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <InternshipDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ---------------------------------- Card ---------------------------------- */

function InternshipCard({ internship }: { internship: Internship }) {
  const [editOpen, setEditOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const idx = PIPELINE.indexOf(internship.status);
  const inPipeline = idx >= 0;
  const link = normalizeLink(internship.link);
  const overdue = isOverdue(internship.deadline) && internship.status !== "accepted" && internship.status !== "rejected";

  const move = (status: InternshipStatus, msg: string) => {
    startTransition(async () => {
      const res = await setInternshipStatus(internship, status);
      if (res.ok) toast(msg);
      else toast(res.error, "error");
    });
  };

  const remove = () => {
    if (!confirm(`Stop tracking ${internship.role} at ${internship.company}?`)) return;
    startTransition(async () => {
      const res = await deleteInternship(internship.id);
      if (res.ok) toast("Application removed.");
      else toast(res.error, "error");
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{internship.company}</p>
          <p className="truncate text-sm text-muted">{internship.role}</p>
        </div>
        <Badge tone={STATUS_TONE[internship.status]}>{STATUS_LABEL[internship.status]}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        {formatDeadline(internship.deadline) && (
          <span className={overdue ? "font-semibold text-danger" : undefined}>
            {overdue ? "Overdue · " : ""}Due {formatDeadline(internship.deadline)}
          </span>
        )}
        {internship.location && <span>{internship.location}</span>}
        {internship.stipend && <span>{internship.stipend}</span>}
      </div>
      {internship.notes && <p className="mt-2 line-clamp-2 text-sm text-muted">{internship.notes}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {inPipeline && idx > 0 && (
          <Button variant="secondary" onClick={() => move(PIPELINE[idx - 1], `Moved back to ${STATUS_LABEL[PIPELINE[idx - 1]]}.`)} loading={pending}>
            ← Back
          </Button>
        )}
        {inPipeline && idx < PIPELINE.length - 1 && (
          <Button onClick={() => move(PIPELINE[idx + 1], `Moved to ${STATUS_LABEL[PIPELINE[idx + 1]]}.`)} loading={pending}>
            {PIPELINE[idx + 1] === "offer" ? "Got offer →" : "Next →"}
          </Button>
        )}
        {internship.status === "offer" && (
          <Button onClick={() => move("accepted", "Accepted — congratulations!")} loading={pending}>
            Accept
          </Button>
        )}
        {internship.status !== "rejected" && internship.status !== "accepted" && (
          <Button variant="secondary" onClick={() => move("rejected", "Marked as rejected.")} loading={pending}>
            Reject
          </Button>
        )}
        {internship.status === "rejected" && (
          <Button variant="secondary" onClick={() => move("wishlist", "Moved back to wishlist.")} loading={pending}>
            Reconsider
          </Button>
        )}
        <span className="flex-1" />
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="text-sm font-semibold text-primary hover:underline">
            Posting ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
          aria-label="Edit application"
        >
          <Icon name="pencil" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={remove}
          className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-danger"
          aria-label="Delete application"
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>
      <InternshipDialog open={editOpen} onClose={() => setEditOpen(false)} initial={internship} />
    </Card>
  );
}

/* ---------------------------------- Board ---------------------------------- */

export function InternshipBoard({ internships }: { internships: Internship[] }) {
  if (internships.length === 0) {
    return (
      <EmptyState
        icon="briefcase"
        title="No applications yet"
        body="Track every internship application — wishlist to offer — in one pipeline."
      />
    );
  }
  const active = internships.filter((i) => !CLOSED.includes(i.status));
  const closed = internships.filter((i) => CLOSED.includes(i.status));
  return (
    <div className="space-y-8">
      <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PIPELINE.map((status) => {
          const items = active.filter((i) => i.status === status);
          if (items.length === 0) return null;
          return (
            <section key={status} aria-label={`${STATUS_LABEL[status]} applications`}>
              <div className="mb-3 flex items-center gap-2">
                <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
                <span className="text-xs text-muted">{items.length}</span>
              </div>
              <div className="space-y-3">
                {items.map((i) => (
                  <InternshipCard key={i.id} internship={i} />
                ))}
              </div>
            </section>
          );
        })}
        {active.length === 0 && (
          <p className="text-sm text-muted">Nothing in the pipeline — everything is closed below.</p>
        )}
      </div>
      {closed.length > 0 && (
        <section aria-label="Closed applications">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Closed</h2>
            <span className="text-xs text-muted">{closed.length}</span>
          </div>
          <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
            {closed.map((i) => (
              <InternshipCard key={i.id} internship={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
