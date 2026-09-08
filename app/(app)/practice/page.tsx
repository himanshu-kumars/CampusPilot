import { redirect } from "next/navigation";
import { PracticeManager } from "@/components/practice";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Exam, Note, PracticeSet, Subject } from "@/lib/types";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string; exam?: string }>;
}) {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Practice" subtitle="Exam-style questions from your own material." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/practice");

  const supabase = await createClient();
  const [{ data: exams }, { data: subjects }, { data: notes }, { data: sets }] = await Promise.all([
    supabase.from("exams").select("*").order("exam_date", { ascending: true }).limit(100),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("notes").select("id,title").order("created_at", { ascending: false }).limit(100),
    supabase.from("practice_sets").select("*").order("created_at", { ascending: false }).limit(50),
  ]);
  const names = new Map(((subjects ?? []) as Subject[]).map((s) => [s.id, s.name]));
  const { note, exam } = await searchParams;

  return (
    <>
      <PageHeader
        title="Practice"
        subtitle="Test yourself with questions generated from your exams and notes."
      />
      <PracticeManager
        exams={((exams ?? []) as Exam[]).map((e) => ({
          id: e.id,
          name: e.subject_id ? (names.get(e.subject_id) ?? "Untitled exam") : "Untitled exam",
        }))}
        notes={(notes ?? []) as { id: string; title: string }[]}
        sets={(sets ?? []) as PracticeSet[]}
        preset={{ noteId: note, examId: exam }}
      />
    </>
  );
}
