"use client";

import { useMemo, useState, useTransition } from "react";
import { LISTING_CATEGORIES, LISTING_CONDITIONS } from "@/lib/validation";
import { createListing, deleteListing, setListingStatus, updateListing } from "@/lib/actions";
import type { Listing, ListingCategory, ListingCondition, ListingStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Checkbox,
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

export const CATEGORY_LABEL: Record<ListingCategory, string> = {
  books: "Books",
  notes: "Notes",
  electronics: "Electronics",
  furniture: "Furniture",
  services: "Services",
  tickets: "Tickets",
  other: "Other",
};

const CONDITION_LABEL: Record<ListingCondition, string> = {
  new: "New",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
};

const STATUS_TONE: Record<ListingStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  reserved: "warning",
  closed: "neutral",
};

const STATUS_LABEL: Record<ListingStatus, string> = {
  active: "Available",
  reserved: "Reserved",
  closed: "Closed",
};

const NEXT_STATUS: Record<ListingStatus, { to: ListingStatus; label: string }> = {
  active: { to: "reserved", label: "Mark reserved" },
  reserved: { to: "closed", label: "Mark closed" },
  closed: { to: "active", label: "Reopen" },
};

const inr = (n: number) =>
  n === 0
    ? "Free"
    : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

/* --------------------------------- Dialog --------------------------------- */

function ListingDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Listing;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    price: initial ? String(initial.price) : "",
    category: (initial?.category ?? "other") as ListingCategory,
    condition: (initial?.condition ?? "") as "" | ListingCondition,
    contact: initial?.contact ?? "",
    status: (initial?.status ?? "active") as ListingStatus,
  });
  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = initial ? await updateListing(initial.id, form) : await createListing(form);
      if (res.ok) {
        toast(initial ? "Listing updated." : "Listing posted.");
        onClose();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit listing" : "Sell or lend"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title" required>
          <Input value={form.title} onChange={set("title")} placeholder="e.g. Engineering Physics textbook" maxLength={120} required />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set("description")} placeholder="Edition, condition details, pickup spot…" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (₹, 0 = free)" required>
            <Input type="number" min={0} step="any" value={form.price} onChange={set("price")} placeholder="0" required />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set("category")}>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Condition">
            <Select value={form.condition} onChange={set("condition")}>
              <option value="">Not specified</option>
              {LISTING_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={set("status")}>
              <option value="active">Available</option>
              <option value="reserved">Reserved</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
        </div>
        <Field label="How can buyers reach you?" required>
          <Input value={form.contact} onChange={set("contact")} placeholder="e.g. WhatsApp 98XXX XXXXX" maxLength={120} required />
        </Field>
        <p className="-mt-2 text-xs text-muted">Only logged-in students see your listing and contact.</p>
        <FormError message={error} />
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={pending}>
            {initial ? "Save changes" : "Post listing"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function ListingDialogButton({ label = "Sell or lend" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Icon name="plus" className="h-4 w-4" />
        {label}
      </Button>
      <ListingDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/* ---------------------------------- Board ---------------------------------- */

function ListingCard({ listing, mine }: { listing: Listing; mine: boolean }) {
  const [editOpen, setEditOpen] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [pending, startTransition] = useTransition();
  const next = NEXT_STATUS[listing.status];

  const cycle = () => {
    startTransition(async () => {
      const res = await setListingStatus(listing, next.to);
      if (res.ok) toast(next.label === "Reopen" ? "Listing reopened." : `Marked as ${STATUS_LABEL[next.to].toLowerCase()}.`);
      else toast(res.error, "error");
    });
  };

  const remove = () => {
    if (!confirm(`Delete “${listing.title}”?`)) return;
    startTransition(async () => {
      const res = await deleteListing(listing.id);
      if (res.ok) toast("Listing deleted.");
      else toast(res.error, "error");
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{listing.title}</p>
          <p className="text-sm font-bold text-primary">{inr(Number(listing.price))}</p>
        </div>
        <Badge tone={STATUS_TONE[listing.status]}>{STATUS_LABEL[listing.status]}</Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
        <span>{CATEGORY_LABEL[listing.category]}</span>
        {listing.condition && <span>{CONDITION_LABEL[listing.condition]}</span>}
      </div>
      {listing.description && <p className="mt-2 line-clamp-2 text-sm text-muted">{listing.description}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {mine ? (
          <>
            <Button variant="secondary" onClick={cycle} loading={pending}>
              {next.label}
            </Button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-ink"
              aria-label="Edit listing"
            >
              <Icon name="pencil" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-lg p-1.5 text-muted hover:bg-slate-100 hover:text-danger"
              aria-label="Delete listing"
            >
              <Icon name="trash" className="h-4 w-4" />
            </button>
          </>
        ) : showContact ? (
          <p className="rounded-lg bg-canvas px-3 py-1.5 text-sm font-medium text-ink">{listing.contact}</p>
        ) : (
          listing.status === "active" && (
            <Button variant="secondary" onClick={() => setShowContact(true)}>
              I&apos;m interested — show contact
            </Button>
          )
        )}
      </div>
      {mine && <ListingDialog open={editOpen} onClose={() => setEditOpen(false)} initial={listing} />}
    </Card>
  );
}

export function MarketplaceBoard({ listings, userId }: { listings: Listing[]; userId: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | ListingCategory>("");
  const [mineOnly, setMineOnly] = useState(false);
  const [hideClosed, setHideClosed] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return listings.filter((l) => {
      if (mineOnly && l.user_id !== userId) return false;
      if (hideClosed && l.status === "closed") return false;
      if (category && l.category !== category) return false;
      if (q && !`${l.title} ${l.description ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [listings, query, category, mineOnly, hideClosed, userId]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
          <Field label="Search">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search books, calculators, cycles…" />
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value as "" | ListingCategory)}>
              <option value="">All categories</option>
              {LISTING_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
            My listings only
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox checked={hideClosed} onChange={(e) => setHideClosed(e.target.checked)} />
            Hide closed
          </label>
          <span className="ml-auto text-xs">
            {filtered.length} of {listings.length}
          </span>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon="tag"
          title={listings.length === 0 ? "Nothing listed yet" : "No matches"}
          body={listings.length === 0 ? "Be the first — sell a book, lend notes, offer a service." : "Try a different search or category."}
        />
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <ListingCard key={l.id} listing={l} mine={l.user_id === userId} />
          ))}
        </div>
      )}
    </div>
  );
}
