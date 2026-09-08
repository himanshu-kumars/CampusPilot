"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/* --------------------------------- Icons --------------------------------- */

export type IconName =
  | "grid"
  | "target"
  | "tasks"
  | "calendar"
  | "spark"
  | "alert"
  | "check"
  | "checkCircle"
  | "clock"
  | "book"
  | "plus"
  | "x"
  | "menu"
  | "logout"
  | "chevronRight"
  | "trash"
  | "pencil"
  | "settings"
  | "compass"
  | "chart"
  | "chat"
  | "users"
  | "briefcase"
  | "trophy"
  | "wifiOff"
  | "cap"
  | "tag"
  | "wallet";

const PATHS: Record<IconName, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </>
  ),
  tasks: (
    <>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 5.5 4.8 6.5 6.5 6.7 5.2 7.8 5.5 9.5 4 8.6 2.5 9.5 2.8 7.8 1.5 6.7 3.2 6.5z" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    </>
  ),
  spark: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </>
  ),
  check: <path d="M4.5 12.5 10 18 19.5 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 12.2 11 14.7 15.5 9.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.4 2" />
    </>
  ),
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: (
    <>
      <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
      <path d="M10 12h11M17 8.5 20.5 12 17 15.5" />
    </>
  ),
  chevronRight: <path d="M9 5.5 15.5 12 9 18.5" />,
  trash: (
    <>
      <path d="M4 7h16M9.5 4.5h5M6.5 7l1 13.2a1 1 0 0 0 1 .8h7a1 1 0 0 0 1-.8L17.5 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  pencil: <path d="M14.5 4.5 19.5 9.5 8.5 20.5l-5 1 1-5z" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.5a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.5h4l.4-2.5a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.1z" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5 13.6 13.6 8.5 15.5l1.9-5.1z" fill="currentColor" stroke="none" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M8.5 16v-5M13 16V7.5M17.5 16v-3" />
    </>
  ),
  chat: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H4l2.3-2.9A8 8 0 1 1 21 12z" />
      <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.2a6.5 6.5 0 0 1 4 5.8" />
    </>
  ),
  briefcase: (
    <>
      <rect x="2.5" y="7" width="19" height="13" rx="2" />
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" />
      <path d="M2.5 13h19" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0V4Z" />
      <path d="M8 5H4.5a.5.5 0 0 0-.5.5C4 8 5.6 10 8 10M16 5h3.5a.5.5 0 0 1 .5.5C20 8 18.4 10 16 10" />
      <path d="M12 12v3M8.5 20h7M10 15.5h4" />
    </>
  ),
  wifiOff: (
    <>
      <path d="M2.5 8.5a14 14 0 0 1 19 0M5.5 12a10 10 0 0 1 13 0M8.6 15.4a6 6 0 0 1 6.8 0" />
      <circle cx="12" cy="19" r="1.2" fill="currentColor" />
      <path d="M3 3l18 18" />
    </>
  ),
  cap: (
    <>
      <path d="M12 4 2.5 9l9.5 5 7.5-3.9V15" />
      <path d="M6.5 11.5V16c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5" />
      <path d="M21.5 9v5" />
    </>
  ),
  tag: (
    <>
      <path d="M3.5 12V4.5A1 1 0 0 1 4.5 3.5H12L20.5 12a1.4 1.4 0 0 1 0 2L14 20.5a1.4 1.4 0 0 1-2 0L3.5 12Z" />
      <circle cx="9" cy="9" r="1.4" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h11A3.5 3.5 0 0 1 19 9.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 3 18V7.5Z" />
      <path d="M3 10h14.5M19 13.5h-4.5a1 1 0 0 0 0 2H19" />
    </>
  ),
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

/* --------------------------------- Button -------------------------------- */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 select-none",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "active:scale-[0.98]",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        fullWidth && "w-full",
        variant === "primary" && "bg-primary text-white shadow-sm hover:bg-primary-dark",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-slate-50",
        variant === "danger" && "bg-danger text-white shadow-sm hover:brightness-95",
        variant === "ghost" && "text-muted hover:bg-slate-100 hover:text-ink",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150",
        "active:scale-[0.98]",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        variant === "primary" && "bg-primary text-white shadow-sm hover:bg-primary-dark",
        variant === "secondary" && "border border-line bg-surface text-ink hover:bg-slate-50",
        variant === "danger" && "bg-danger text-white shadow-sm hover:brightness-95",
        variant === "ghost" && "text-muted hover:bg-slate-100 hover:text-ink",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cx("animate-spin", className)} aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity={0.2} />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------- Card --------------------------------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(17,24,39,0.04)]", className)}>
      {children}
    </div>
  );
}

/* ---------------------------------- Badge -------------------------------- */

type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const BADGE_STYLES: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-success ring-emerald-600/20",
  warning: "bg-amber-50 text-warning ring-amber-600/25",
  danger: "bg-red-50 text-danger ring-red-600/20",
  info: "bg-indigo-50 text-primary ring-indigo-600/20",
  neutral: "bg-slate-100 text-muted ring-slate-600/10",
};

export function Badge({
  tone = "neutral",
  icon,
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        BADGE_STYLES[tone],
        className
      )}
    >
      {icon && <Icon name={icon} className="h-3.5 w-3.5" />}
      {children}
    </span>
  );
}

/* ------------------------------- Progress -------------------------------- */

export function ProgressBar({
  value,
  tone = "info",
  label,
}: {
  value: number | null;
  tone?: BadgeTone;
  label?: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)));
  const bar =
    tone === "success"
      ? "bg-success"
      : tone === "warning"
        ? "bg-warning"
        : tone === "danger"
          ? "bg-danger"
          : tone === "neutral"
            ? "bg-slate-300"
            : "bg-primary";
  return (
    <div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={value === null ? undefined : pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div className={cx("h-full rounded-full transition-all duration-300", bar)} style={{ width: `${pct}%` }} />
      </div>
      {label && <p className="mt-1.5 text-xs text-muted">{label}</p>}
    </div>
  );
}

/* ---------------------------------- Forms -------------------------------- */

const CONTROL =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/25 focus:outline-none disabled:opacity-60";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(CONTROL, props.className)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(CONTROL, "min-h-20 resize-y", props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(CONTROL, "cursor-pointer", props.className)} />;
}

export function Checkbox(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      {...props}
      className={cx(
        "h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-line bg-surface transition-all",
        "checked:border-primary checked:bg-primary",
        "checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M4.5 12.5 10 18 19.5 7%22/></svg>')]",
        "checked:bg-center checked:bg-no-repeat checked:bg-[length:14px_14px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        props.className
      )}
    />
  );
}

export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {required && (
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-xs font-medium text-danger">
          {error}
        </span>
      )}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-danger ring-1 ring-red-600/20">
      <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/* ---------------------------------- Modal -------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          "animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-surface p-6 shadow-xl outline-none sm:rounded-2xl",
          wide ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-slate-100 hover:text-ink"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------ States ----------------------------------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 [&_button]:w-full sm:[&_button]:w-auto">{action}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-primary">
        <Icon name={icon} className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx("animate-pulse-soft rounded-xl bg-slate-200/80", className)} />;
}

export function SetupRequired() {
  return (
    <Card className="mx-auto max-w-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-warning">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Supabase is not connected</h2>
          <p className="mt-1 text-sm text-muted">
            CampusPilot needs a Supabase project before it can store your data. This takes about
            two minutes:
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>Create a project at supabase.com and open the SQL Editor.</li>
            <li>
              Run <code className="rounded bg-slate-100 px-1 font-mono text-xs">07_DATABASE_SCHEMA.sql</code> from
              this repo, then optionally <code className="rounded bg-slate-100 px-1 font-mono text-xs">31_SUPABASE_TRIGGER.sql</code>.
            </li>
            <li>
              Copy <code className="rounded bg-slate-100 px-1 font-mono text-xs">.env.example</code> to{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">.env.local</code> and fill in{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
            </li>
            <li>Restart the dev server and sign up.</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}

export function DbSetupRequired() {
  return (
    <Card className="mx-auto max-w-xl">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-warning">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-ink">Database tables are missing</h2>
          <p className="mt-1 text-sm text-muted">
            Your account and login work fine — but the app&apos;s tables don&apos;t exist yet.
            Run the migrations once:
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>Open your Supabase project → SQL Editor → New query.</li>
            <li>
              Paste and Run each file in order:{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">07_DATABASE_SCHEMA.sql</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">002_phase2.sql</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">003_phase3.sql</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">004_phase4.sql</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">005_phase5.sql</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-xs">006_phase6.sql</code>.
            </li>
            <li>Come back here and refresh — your data will start saving.</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------- Toast --------------------------------- */

type ToastTone = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}

export function toast(message: string, tone: ToastTone = "success") {
  window.dispatchEvent(new CustomEvent<ToastItem>("cp-toast", { detail: { id: Date.now(), message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastItem>).detail;
      setItems((prev) => [...prev.slice(-2), detail]);
      window.setTimeout(() => dismiss(detail.id), 3600);
    };
    window.addEventListener("cp-toast", onToast);
    return () => window.removeEventListener("cp-toast", onToast);
  }, [dismiss]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            "animate-rise pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg",
            t.tone === "success" && "bg-ink text-white",
            t.tone === "error" && "bg-danger text-white",
            t.tone === "info" && "bg-surface text-ink ring-1 ring-line"
          )}
        >
          <Icon
            name={t.tone === "error" ? "alert" : t.tone === "info" ? "spark" : "checkCircle"}
            className="h-4 w-4 shrink-0"
          />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
