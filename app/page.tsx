import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import { ButtonLink, Icon, type IconName } from "@/components/ui";

const PROBLEMS: { icon: IconName; title: string; body: string }[] = [
  { icon: "target", title: "Attendance", body: "You never know your real percentage — or how many classes you can safely miss." },
  { icon: "tasks", title: "Assignments", body: "Deadlines scattered across WhatsApp groups, PDFs and portals." },
  { icon: "calendar", title: "Exams", body: "Preparation starts too late because there is no realistic plan." },
  { icon: "spark", title: "Study planning", body: "Generic timetables ignore your time, syllabus and weak areas." },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "grid", title: "One dashboard", body: "Attendance, deadlines, exams and today's priorities in a single five-second glance." },
  { icon: "target", title: "Attendance radar", body: "Live percentages, risk states, and exactly how many classes you need to recover." },
  { icon: "tasks", title: "Deadline control", body: "Assignments sorted by real urgency — overdue and due-soon surface first." },
  { icon: "spark", title: "AI study plans", body: "Personalized day-by-day schedules built from your exam date, prep level and free hours." },
];

export default async function LandingPage() {
  if (supabaseConfigured()) {
    const user = await getSessionUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Icon name="compass" className="h-5 w-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">CampusPilot</span>
        </span>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Get Started
          </ButtonLink>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 text-center sm:px-6 sm:pt-20">
        <p className="animate-rise mx-auto inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-primary ring-1 ring-indigo-600/20">
          <Icon name="spark" className="h-3.5 w-3.5" />
          AI-powered student success platform
        </p>
        <h1
          className="animate-rise mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight text-ink sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Your college life, under control.
        </h1>
        <p
          className="animate-rise mx-auto mt-5 max-w-2xl text-base text-muted sm:text-lg"
          style={{ animationDelay: "120ms" }}
        >
          Track attendance, deadlines, exams, and let AI build a study plan around your real
          schedule.
        </p>
        <div
          className="animate-rise mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <ButtonLink href="/signup" size="lg">
            Get Started
            <Icon name="chevronRight" className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="#how-it-works" variant="secondary" size="lg">
            See how it works
          </ButtonLink>
        </div>

        {/* Product preview */}
        <div
          className="animate-rise mx-auto mt-12 max-w-4xl rounded-2xl border border-line bg-surface p-4 text-left shadow-[0_8px_30px_rgba(79,70,229,0.08)] sm:p-6"
          style={{ animationDelay: "240ms" }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Attendance</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                68% <span className="text-sm font-semibold text-danger">· Critical</span>
              </p>
              <p className="mt-1 text-xs text-muted">Digital Electronics · needs 7 classes in a row</p>
            </div>
            <div className="rounded-xl bg-canvas p-4">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Next exam</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                5 <span className="text-sm font-semibold text-muted">days left</span>
              </p>
              <p className="mt-1 text-xs text-muted">Mathematics-I · 30% prepared</p>
            </div>
            <div className="rounded-xl bg-primary p-4 text-white">
              <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase opacity-80">
                <Icon name="spark" className="h-3.5 w-3.5" /> AI recommendation
              </p>
              <p className="mt-1 text-sm leading-snug font-medium">
                Your Mathematics exam is in 5 days. Start Unit 2 today.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Your academic life is scattered.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-canvas p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-primary ring-1 ring-line">
                  <Icon name={p.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-base font-semibold text-ink">{p.title}</h3>
                <p className="mt-1 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-8 px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          One workspace for everything academic.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted">
          CampusPilot answers three questions the moment you open it: what needs attention, how
          much time you have, and what to study next.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-primary">
                <Icon name={f.icon} className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Emergency mode spotlight */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-ink p-6 text-white sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Icon name="alert" className="h-3.5 w-3.5" />
                Emergency Study Mode
              </p>
              <h3 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
                Exam in 3 days? 25% prepared?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70 sm:text-base">
                CampusPilot switches strategy: high-value topics first, protected revision time,
                practice blocks and a mock test — all inside the hours you actually have.
              </p>
              <div className="mt-6">
                <ButtonLink href="/signup" size="lg" className="bg-white text-ink hover:bg-white/90">
                  Try it free
                </ButtonLink>
              </div>
            </div>
            <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs font-bold tracking-wider text-amber-300 uppercase">Day 1 · Integration crash review</p>
              <ul className="mt-3 space-y-2 text-sm">
                {[
                  ["Learn: Integration formulas + 5 solved examples", "90 min"],
                  ["Practice: 20 mixed questions, timed", "45 min"],
                  ["Revision: mistake log + formula sheet", "30 min"],
                ].map(([task, time]) => (
                  <li key={task} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
                    <span className="text-white/90">{task}</span>
                    <span className="shrink-0 text-xs text-white/50">{time}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-2xl bg-primary px-6 py-12 text-center text-white sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">Start planning smarter.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/80 sm:text-base">
            Join CampusPilot and turn scattered deadlines into one calm, achievable plan.
          </p>
          <div className="mt-8">
            <ButtonLink href="/signup" size="lg" className="bg-white text-primary hover:bg-white/90">
              Get Started
              <Icon name="chevronRight" className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
          <span className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-white">
              <Icon name="compass" className="h-3.5 w-3.5" />
            </span>
            CampusPilot — your college life, under control.
          </span>
          <span className="flex gap-4">
            <Link href="/login" className="hover:text-ink hover:underline">
              Log in
            </Link>
            <Link href="/signup" className="hover:text-ink hover:underline">
              Sign up
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
