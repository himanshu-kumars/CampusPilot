import { redirect } from "next/navigation";
import { StudyPlanner, type PlannerExam } from "@/components/study-planner";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Exam, Subject } from "@/lib/types";

export default async function StudyPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ exam?: string }>;
}) {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="AI Study Planner" subtitle="A realistic plan built around your time." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/study-planner");

  const supabase = await createClient();
  const [{ data: exams }, { data: subjects }] = await Promise.all([
    supabase.from("exams").select("*").order("exam_date", { ascending: true }).limit(100),
    supabase.from("subjects").select("*").order("name"),
  ]);
  const names = new Map(((subjects ?? []) as Subject[]).map((s) => [s.id, s.name]));
  const plannerExams: PlannerExam[] = ((exams ?? []) as Exam[]).map((e) => ({
    id: e.id,
    name: e.subject_id ? (names.get(e.subject_id) ?? "Untitled exam") : "Untitled exam",
    exam_date: e.exam_date,
    preparation_percent: e.preparation_percent,
    syllabus: e.syllabus,
    weak_topics: e.weak_topics,
  }));
  const { exam } = await searchParams;

  return (
    <>
      <PageHeader
        title="AI Study Planner"
        subtitle="Plans respect your available hours, preparation level and syllabus — nothing more."
      />
      <StudyPlanner exams={plannerExams} initialExamId={exam} />
    </>
  );
}
