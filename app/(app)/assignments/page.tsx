import { redirect } from "next/navigation";
import { AssignmentDialogButton, AssignmentList } from "@/components/entities";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Assignment, Subject } from "@/lib/types";

export default async function AssignmentsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Assignments" subtitle="Every deadline, sorted by real urgency." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/assignments");

  const supabase = await createClient();
  const [{ data: assignments }, { data: subjects }] = await Promise.all([
    supabase.from("assignments").select("*").order("deadline", { ascending: true }).limit(200),
    supabase.from("subjects").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Assignments"
        subtitle="Every deadline, sorted by real urgency."
        action={<AssignmentDialogButton subjects={(subjects ?? []) as Subject[]} />}
      />
      <AssignmentList
        assignments={(assignments ?? []) as Assignment[]}
        subjects={(subjects ?? []) as Subject[]}
      />
    </>
  );
}
