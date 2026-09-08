import { redirect } from "next/navigation";
import { SubjectDialogButton, SubjectGrid } from "@/components/entities";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Subject } from "@/lib/types";

export default async function AttendancePage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Attendance" subtitle="Know your real percentage — and how to recover." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/attendance");

  const supabase = await createClient();
  const { data } = await supabase.from("subjects").select("*").order("name");
  const subjects = (data ?? []) as Subject[];

  return (
    <>
      <PageHeader
        title="Attendance"
        subtitle="Percentages are estimated from the numbers you record — not official university records."
        action={<SubjectDialogButton />}
      />
      <SubjectGrid subjects={subjects} />
    </>
  );
}
