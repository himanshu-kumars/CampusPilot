"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { Button, Field, FormError, Icon, Input, SetupRequired } from "./ui";

/** Rejects with Error("TIMEOUT") if the Supabase request hangs (no more infinite spinners). */
function withTimeout<T>(promise: Promise<T>, ms = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}

function connectionMessage(e: unknown, action: string): string {
  if (e instanceof Error && e.message === "TIMEOUT") {
    return `Couldn't reach Supabase (timed out). Check your internet, verify NEXT_PUBLIC_SUPABASE_URL in .env.local, and make sure your Supabase project isn't paused — then restart "npm run dev" and try ${action} again.`;
  }
  if (
    e instanceof TypeError ||
    (e instanceof Error && /fetch|network|load failed|offline/i.test(e.message))
  ) {
    return `Can't reach Supabase from this browser. Check your internet connection and the project URL in .env.local, then try ${action} again.`;
  }
  return e instanceof Error && e.message ? e.message : `Could not ${action}. Try again.`;
}

function TroubleHint() {
  return (
    <details className="mt-4 text-sm text-muted">
      <summary className="cursor-pointer font-medium hover:text-ink">Having trouble? Check these</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px]">
        <li>
          <code className="rounded bg-slate-100 px-1">.env.local</code> has the correct Supabase URL +
          key, and you restarted <code className="rounded bg-slate-100 px-1">npm run dev</code> after
          creating it.
        </li>
        <li>Your Supabase project is active (not paused) at supabase.com/dashboard.</li>
        <li>You ran the SQL files (07, then 002–006) in the Supabase SQL Editor.</li>
        <li>
          If login says &quot;not confirmed&quot;, check your inbox or turn off &quot;Confirm
          email&quot; in Supabase → Authentication settings.
        </li>
      </ul>
    </details>
  );
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
          <Icon name="compass" className="h-6 w-6" />
        </span>
        <span className="text-xl font-bold tracking-tight text-ink">CampusPilot</span>
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  if (!supabaseConfigured()) {
    return (
      <AuthCard title="Welcome back" subtitle="Log in to your academic command center.">
        <SetupRequired />
      </AuthCard>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResend(false);
    setResent(false);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password })
      );
      if (err) {
        const msg = err.message.toLowerCase();
        if (msg.includes("email not confirmed")) {
          setError("Your email isn't confirmed yet. Check your inbox for the confirmation link, then try again.");
          setShowResend(true);
        } else if (msg.includes("invalid login credentials") || msg.includes("invalid email or password")) {
          setError("Invalid email or password. Please try again.");
        } else {
          setError(err.message);
        }
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      console.error("[auth] login failed", e);
      setError(connectionMessage(e, "logging in"));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: err } = await withTimeout(supabase.auth.resend({ type: "signup", email }));
      if (err) setError(err.message);
      else {
        setResent(true);
        setShowResend(false);
      }
    } catch (e) {
      console.error("[auth] resend failed", e);
      setError(connectionMessage(e, "resending the email"));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Log in to your academic command center.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email" required>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@college.edu" />
        </Field>
        <Field label="Password" required>
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
        </Field>
        <FormError message={error} />
        {resent && (
          <div role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-success ring-1 ring-emerald-600/20">
            Confirmation email sent. Click the link in your inbox, then log in.
          </div>
        )}
        <Button type="submit" fullWidth loading={loading}>
          Log in
        </Button>
        {showResend && (
          <Button type="button" variant="secondary" fullWidth loading={resending} onClick={resend}>
            Resend confirmation email
          </Button>
        )}
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to CampusPilot?{" "}
        <Link href="/signup" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
      </p>
      <TroubleHint />
    </AuthCard>
  );
}

export function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", college: "", semester: "" });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!supabaseConfigured()) {
    return (
      <AuthCard title="Create your account" subtitle="Your college life, under control.">
        <SetupRequired />
      </AuthCard>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setAlreadyRegistered(false);
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: err } = await withTimeout(
        supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: { full_name: form.fullName, college: form.college || null, semester: form.semester || null },
          },
        })
      );
      if (err) {
        if (err.message.toLowerCase().includes("already registered") || err.message.toLowerCase().includes("already exists")) {
          setError("This email already has an account. Log in instead.");
          setAlreadyRegistered(true);
        } else {
          setError(err.message);
        }
        return;
      }
      if (!data.session) {
        setNotice("Account created. Check your email to confirm, then log in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      console.error("[auth] signup failed", e);
      setError(connectionMessage(e, "creating your account"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="Your college life, under control.">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Full name" required>
          <Input required value={form.fullName} onChange={set("fullName")} placeholder="Aarav Sharma" autoComplete="name" />
        </Field>
        <Field label="Email" required>
          <Input type="email" required value={form.email} onChange={set("email")} placeholder="you@college.edu" autoComplete="email" />
        </Field>
        <Field label="Password" required hint="At least 6 characters.">
          <Input type="password" required value={form.password} onChange={set("password")} placeholder="Create a password" autoComplete="new-password" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="College">
            <Input value={form.college} onChange={set("college")} placeholder="Optional" autoComplete="organization" />
          </Field>
          <Field label="Semester">
            <Input value={form.semester} onChange={set("semester")} placeholder="e.g. 3" />
          </Field>
        </div>
        <FormError message={error} />
        {alreadyRegistered && (
          <Link href="/login" className="block text-center text-sm font-semibold text-primary hover:underline">
            Go to login →
          </Link>
        )}
        {notice && (
          <div role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-success ring-1 ring-emerald-600/20">
            {notice}
          </div>
        )}
        <Button type="submit" fullWidth loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Log in
        </Link>
      </p>
      <TroubleHint />
    </AuthCard>
  );
}
