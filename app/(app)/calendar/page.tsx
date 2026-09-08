import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar-view";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Assignment, Exam, Subject } from "@/lib/types";

export default async function CalendarPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Calendar" subtitle="Deadlines and exams in one view." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/calendar");

  const supabase = await createClient();
  const [{ data: assignments }, { data: exams }, { data: subjects }] = await Promise.all([
    supabase.from("assignments").select("*").neq("status", "completed").limit(300),
    supabase.from("exams").select("*").limit(200),
    supabase.from("subjects").select("id,name"),
  ]);
  const names: Record<string, string> = {};
  for (const s of ((subjects ?? []) as Subject[])) names[s.id] = s.name;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="Deadlines and exams in one view — exportable to any calendar app."
      />
      <CalendarView
        assignments={(assignments ?? []) as Assignment[]}
        exams={(exams ?? []) as Exam[]}
        names={names}
      />
    </>
  );
}
