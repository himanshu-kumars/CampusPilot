/**
 * Phase 4: XP engine.
 *
 * XP is DERIVED from the existing `activity_events` log — every point traces
 * back to a real action the student took. No separate ledger, no double
 * counting, and history before Phase 4 counts retroactively.
 *
 * Level curve: level N starts at 100·(N−1)² total XP
 * (L1: 0, L2: 100, L3: 400, L4: 900, L5: 1600 …).
 */

/** Points per activity kind. `viva_turn` is 0 by design: finishing earns, spamming turns doesn't. */
export const XP_RULES: Record<string, number> = {
  class_recorded: 10,
  assignment_created: 5,
  assignment_completed: 25,
  group_task_completed: 15,
  study_task_completed: 10,
  quiz_completed: 20,
  viva_completed: 20,
  viva_turn: 0,
  viva_question_answered: 2,
  plan_generated: 15,
  ai_summary: 5,
  ai_questions: 5,
  subject_created: 5,
  exam_created: 10,
  note_created: 5,
  group_created: 20,
  group_joined: 20,
  share_created: 10,
  csv_imported: 5,
  internship_added: 10,
  internship_offer: 50,
  internship_accepted: 100,
  listing_created: 10,
  fee_added: 5,
  fee_paid: 15,
};

/** Points for unknown/future kinds — generous default so new features earn. */
export const DEFAULT_XP = 5;

export function xpForKind(kind: string): number {
  return XP_RULES[kind] ?? DEFAULT_XP;
}

/** Total XP at which `level` starts (level 1 starts at 0). */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  return 100 * (n - 1) * (n - 1);
}

/** Level for a lifetime XP total. */
export function levelForXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  return Math.floor(Math.sqrt(xp / 100)) + 1;
}

export interface XpEvent {
  kind: string;
  created_at: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

export interface XpSummary {
  totalXp: number;
  level: number;
  intoLevel: number;
  neededForNext: number;
  progress: number;
  todayXp: number;
  weekXp: number;
  actionsCount: number;
  byKind: { kind: string; count: number; xp: number }[];
  badges: Badge[];
}

export function summarizeXp(events: XpEvent[], streakDays: number): XpSummary {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  let totalXp = 0;
  let todayXp = 0;
  let weekXp = 0;
  const byKind = new Map<string, { count: number; xp: number }>();
  let completions = 0;
  let sawGroup = false;
  let sawShare = false;

  for (const e of events) {
    const pts = xpForKind(e.kind);
    totalXp += pts;
    const t = new Date(e.created_at).getTime();
    if (!Number.isNaN(t)) {
      if (t >= startOfToday) todayXp += pts;
      if (t >= weekAgo) weekXp += pts;
    }
    const slot = byKind.get(e.kind) ?? { count: 0, xp: 0 };
    slot.count += 1;
    slot.xp += pts;
    byKind.set(e.kind, slot);
    if (e.kind === "assignment_completed" || e.kind === "group_task_completed" || e.kind === "study_task_completed") {
      completions += 1;
    }
    if (e.kind === "group_created" || e.kind === "group_joined") sawGroup = true;
    if (e.kind === "share_created") sawShare = true;
  }

  const level = levelForXp(totalXp);
  const cur = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const intoLevel = totalXp - cur;
  const neededForNext = next - cur;

  const badges: Badge[] = [
    { id: "first-steps", name: "First Steps", description: "Log your first activity", earned: events.length > 0 },
    { id: "getting-warm", name: "Getting Warm", description: "Earn 100 total XP", earned: totalXp >= 100 },
    { id: "on-fire", name: "On Fire", description: "Earn 500 total XP", earned: totalXp >= 500 },
    { id: "scholar", name: "Scholar", description: "Earn 1,500 total XP", earned: totalXp >= 1500 },
    { id: "closer", name: "Closer", description: "Complete 5 tasks", earned: completions >= 5 },
    { id: "team-player", name: "Team Player", description: "Join or create a study group", earned: sawGroup },
    { id: "mentor-ready", name: "Mentor Ready", description: "Create a mentor share link", earned: sawShare },
    { id: "week-warrior", name: "Week Warrior", description: "Reach a 7-day streak", earned: streakDays >= 7 },
    { id: "unstoppable", name: "Unstoppable", description: "Reach a 30-day streak", earned: streakDays >= 30 },
  ];

  return {
    totalXp,
    level,
    intoLevel,
    neededForNext,
    progress: neededForNext > 0 ? Math.min(1, intoLevel / neededForNext) : 1,
    todayXp,
    weekXp,
    actionsCount: events.length,
    byKind: [...byKind.entries()]
      .map(([kind, v]) => ({ kind, ...v }))
      .sort((a, b) => b.xp - a.xp),
    badges,
  };
}
