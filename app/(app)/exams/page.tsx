import { redirect } from "next/navigation";
import { ExamDialogButton, ExamGrid } from "@/components/entities";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Exam, Subject } from "@/lib/types";

export default async function ExamsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Exam Planner" subtitle="Record exams, track readiness, plan with AI." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/exams");

  const supabase = await createClient();
  const [{ data: exams }, { data: subjects }] = await Promise.all([
    supabase.from("exams").select("*").order("exam_date", { ascending: true }).limit(100),
    supabase.from("subjects").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Exam Planner"
        subtitle="Record exams, track readiness, plan with AI."
        action={<ExamDialogButton subjects={(subjects ?? []) as Subject[]} />}
      />
      <ExamGrid exams={(exams ?? []) as Exam[]} subjects={(subjects ?? []) as Subject[]} />
    </>
  );
}
