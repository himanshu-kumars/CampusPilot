import { redirect } from "next/navigation";
import { TimetableManager } from "@/components/timetable";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Subject, TimetableEntry } from "@/lib/types";

export default async function TimetablePage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Timetable" subtitle="Your weekly classes, linked to attendance." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/timetable");

  const supabase = await createClient();
  const [{ data: entries }, { data: subjects }] = await Promise.all([
    supabase.from("timetable_entries").select("*").order("day_of_week").order("start_time"),
    supabase.from("subjects").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Timetable"
        subtitle="Set your week once — mark attendance straight from today's classes."
      />
      <TimetableManager
        entries={(entries ?? []) as TimetableEntry[]}
        subjects={(subjects ?? []) as Subject[]}
      />
    </>
  );
}
