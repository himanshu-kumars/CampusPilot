import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ensureProfile } from "@/lib/actions";
import { buildAlerts } from "@/lib/notifications";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Assignment, Exam, Subject } from "@/lib/types";

// Always render per-request: session + user data must never be statically cached.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseConfigured()) {
    return (
      <AppShell displayName="Student" userEmail={null} alerts={[]}>
        {children}
      </AppShell>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const profile = await ensureProfile();

  // Notification center data (fresh on every navigation).
  const supabase = await createClient();
  const [{ data: subjects }, { data: assignments }, { data: exams }, { data: dismissals }] =
    await Promise.all([
      supabase.from("subjects").select("*"),
      supabase.from("assignments").select("*"),
      supabase.from("exams").select("*"),
      supabase.from("notification_dismissals").select("alert_key"),
    ]);
  const names = new Map(((subjects ?? []) as Subject[]).map((s) => [s.id, s.name]));
  const dismissed = new Set(
    ((dismissals ?? []) as { alert_key: string }[]).map((d) => d.alert_key)
  );
  const alerts = buildAlerts({
    subjects: (subjects ?? []) as Subject[],
    assignments: (assignments ?? []) as Assignment[],
    exams: (exams ?? []) as Exam[],
    subjectName: (id) => (id ? (names.get(id) ?? "Untitled") : "Untitled"),
  }).filter((a) => !dismissed.has(a.key));

  return (
    <AppShell
      displayName={profile?.full_name ?? "Student"}
      userEmail={user.email ?? null}
      alerts={alerts}
    >
      {children}
    </AppShell>
  );
}
