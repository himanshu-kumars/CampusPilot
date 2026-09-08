# CampusPilot — Your college life, under control.

CampusPilot is an AI-powered student success platform: attendance tracking, assignment
deadlines, exam planning and personalized AI study plans (including Emergency Study Mode)
in one focused dashboard.

This repo contains the **full product spec pack** (`00`–`34` files) plus the working
Next.js MVP implementation.

## Stack

- Next.js 15 (App Router) + TypeScript (strict) + Tailwind CSS v4
- Supabase (Auth + PostgreSQL + Row Level Security)
- Zod validation (API inputs + AI outputs)
- Gemini API for study-plan generation (server-side only)
- Vercel-ready deployment

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in values (below)
npm run dev
```

### 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL Editor and run **`07_DATABASE_SCHEMA.sql`** from this repo.
3. Run **`supabase/migrations/002_phase2.sql`** for Phase 2 tables (notes, practice,
   viva, notifications, activity).
4. Run **`supabase/migrations/003_phase3.sql`** for Phase 3 tables (timetable,
   study groups, share links) plus the code-checked join and member-list RPCs.
4. Run **`supabase/migrations/004_phase4.sql`** for the Phase 4 `internships` table
   (XP needs no new table — it derives from `activity_events`).
4. Run **`supabase/migrations/005_phase5.sql`** for mentor feedback
   (`share_feedback` + token-checked RPC) and `push_subscriptions`.
4. Run **`supabase/migrations/006_phase6.sql`** for `listings`, `fees`, feedback
   reply columns + thread RPC (mentors see your replies on the report).
4. Optionally run **`31_SUPABASE_TRIGGER.sql`** (auto-creates a profile row on signup —
   the app also self-heals a missing profile at login).
4. Copy your project URL + anon key into `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 2. AI key (Gemini)

```bash
GOOGLE_GENERATIVE_AI_API_KEY=...   # server-only, never NEXT_PUBLIC_
```

Without a key the planner still works: it returns a clearly-labelled **sample plan**
from the built-in deterministic planner so the UI stays demonstrable.

### 3. Verify

```bash
npm run typecheck
npm run build
```

Checklist: sign up → dashboard → add subject (17/25 → 68%) → add assignment →
add exam (5 days out, 30% prep) → generate AI plan → toggle Emergency Mode →
mark tasks complete.

## Project structure

```text
app/
  page.tsx                 Landing page
  login/  signup/          Auth (Supabase)
  (app)/                   Authenticated shell + pages
    dashboard/ attendance/ assignments/ exams/ study-planner/ settings/
    notes/ practice/ viva/ calendar/ analytics/   (Phase 2)
    timetable/ groups/                             (Phase 3)
    internships/                                     (Phase 4)
    placement/                                       (Phase 5)
    marketplace/ fees/                               (Phase 6)
  share/[token]/           Public read-only mentor report (Phase 3)
  offline/                 Offline fallback page (Phase 4)
  manifest.ts              PWA manifest (Phase 3)
  api/
    study-plan/            AI plan generation (validated, rate-limited)
    ai/summarize|questions|viva/                  (Phase 2 AI)
    events/                Client activity logging
    calendar.ics/          Downloadable calendar feed
    export/                Full JSON data export (Phase 3)
components/
  ui.tsx                   Design primitives (buttons, cards, badges, modal, toast…)
  app-shell.tsx            Sidebar / mobile nav shell + notification bell
  entities.tsx             Subject / assignment / exam managers + profile form
  study-planner.tsx        Planner form, timeline, emergency mode, task tracking
  notes.tsx                Upload/paste notes, summaries
  practice.tsx             Question generation + interactive quiz runner
  viva.tsx                 AI viva examiner sessions
  calendar-view.tsx        Month calendar + .ics export
  notification-bell.tsx    Reminder dropdown
  auth-forms.tsx           Login / signup forms
lib/
  calculations.ts          Attendance %, recovery estimate, sorting, insights
  notifications.ts         Rule-based reminder builder (Phase 2)
  events.ts                Best-effort activity logging (Phase 2)
  validation.ts            Zod schemas (inputs + AI output contracts)
  ai.ts                    Gemini prompts, validation + repair retry, fallback planners
  actions.ts               Server Actions for all CRUD + profile + Phase 2
  supabase/                Browser + server clients
middleware.ts              Session refresh + protected-route redirects
supabase/migrations/       Phase 2 tables (+ RLS)
```

## Phase 2 features

- **Notes** (`/notes`): upload PDF/TXT (≤5 MB, parsed server-side) or paste text;
  AI summaries with key points, terms and self-test questions.
- **Practice** (`/practice`): AI MCQs + short questions from an exam syllabus or
  notes, interactive quiz runner with scoring, retries and history.
- **Viva** (`/viva`): live AI examiner — per-answer feedback, 1–5 scoring,
  saveable sessions.
- **Calendar** (`/calendar`): month view of deadlines/exams + one-click `.ics`
  export for Google/Apple/Outlook.
- **Notifications**: rule-based reminders (overdue, due-today, exam-soon,
  attendance risk) with persisted dismissals.
- **Analytics** (`/analytics`): 14-day activity chart, assignment mix, attendance
  and readiness bars, insights and recent-activity feed.

Without an AI key, summaries and note-based questions fall back to clearly-labelled
sample output; exam questions and viva honestly require a key.

## Phase 3 features

- **Timetable** (`/timetable`): weekly class grid with overlap protection, room labels,
  and one-tap Present/Absent marking; today's classes surface on the dashboard.
- **Study Groups** (`/groups`): create/join via 6-character invite codes (code-checked
  server-side RPC), shared tasks, member list, completions leaderboard.
- **Mentor sharing** (Settings → `/share/[token]`): expiring read-only progress-report
  links served by a curated RPC — attendance, deadlines, readiness; no notes or chats.
- **Data portability** (Settings): CSV subject import (with template + row report) and
  full JSON export. Honest integrations: your data moves freely, nothing is faked.
- **Installable app**: web manifest, theme color and iOS meta — Add to Home Screen
  for a full-screen experience.
- **Personalized analytics**: day streaks, focus-subject scoring, prep momentum from
  logged changes, and week-in-review counts.

## Phase 4 features

- **XP engine** (dashboard + `/analytics`): every logged action earns points derived
  from `activity_events` — no separate ledger, history counts retroactively. Levels
  follow a 100·(N−1)² curve, plus 9 honest badges (streaks, completions, groups,
  offers). Practice turns earn 0 so grinding questions can't farm XP.
- **Internship tracker** (`/internships`): wishlist → applied → screening →
  interview → offer → accepted/rejected pipeline with deadlines, posting links,
  stipend/location notes; active applications and next deadline on the dashboard.
- **Offline mode**: service worker (production only) with network-first navigation
  falling back to a cached `/offline` page, and stale-while-revalidate static
  caching. Offline never fakes data — it just fails gracefully.

## Phase 5 features

- **Placement prep** (`/placement`): 10 AI-drilled tracks (quant, logical, verbal,
  DSA, OOPs, DBMS, OS, CN, HR, puzzles) reusing the practice quiz engine — attempts
  and best scores saved, plus a static interview checklist (before/during/after).
- **Mentor feedback**: anyone opening your share link can leave a note via a
  token-checked RPC (no login, expiry enforced); notes show in Settings per link
  with owner delete. Revoking a link deletes its notes.
- **Push reminders** (Settings): VAPID web-push with per-browser enable/test, a
  real test delivery, and a daily Vercel-cron summary (assignments due in 24h,
  exams in 3 days). Quiet by design — no due items means no notification.
  Setup: `npx web-push generate-vapid-keys` → set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` / `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY`, deploy to
  Vercel (cron runs automatically). Without keys the UI honestly says push is off.

## Phase 6 features

- **Marketplace** (`/marketplace`): campus buy/sell/lend board — books, notes,
  electronics and more, with search, category filter, condition, INR pricing
  (0 = free), and available/reserved/closed flow. Any logged-in student can
  browse; contact details are seller-provided and revealed on interest.
- **Fee tracker** (`/fees`): tuition/hostel/mess/exam dues with amounts, due dates,
  paid/unpaid states and overdue highlighting, plus dashboard totals. Optional
  **receipt scan**: Tesseract.js OCR runs on-device (loaded on demand) to prefill
  amount + date — always shown for verification, manual entry always works.
- **Feedback replies**: two-way mentor notes — reply from Settings, mentors see
  the thread on your share report via a token-checked RPC.

## Key decisions

- **Schema over diagram:** `07_DATABASE_SCHEMA.sql` folds attendance into `subjects`
  (simpler than the separate-table sketch in `02_ARCHITECTURE.md`) — the SQL wins.
- **Server Actions** for CRUD, one **Route Handler** for `/api/study-plan`.
- **No fake functionality:** without Supabase keys, pages render setup guidance;
  without an AI key, plans are labelled as samples.
- Attendance figures are estimates from user-recorded numbers, never presented as
  official records. AI output never guarantees grades.

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Add the three env vars above (production).
3. Deploy. Supabase Auth redirect URLs must include your production domain.

See `17_DEPLOYMENT_CHECKLIST.md` and `24_SUBMISSION_CHECKLIST.md` for the full
hackathon QA flow, and `10_DEMO_AND_PITCH.md` for the 6-step demo script.
