import { redirect } from "next/navigation";
import { VivaManager, type VivaExam } from "@/components/viva";
import { Card, Icon, PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Exam, Subject, VivaSession } from "@/lib/types";

export default async function VivaPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Viva Practice" subtitle="Rehearse oral exams with an AI examiner." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/viva");

  const supabase = await createClient();
  const [{ data: exams }, { data: subjects }, { data: sessions }] = await Promise.all([
    supabase.from("exams").select("*").order("exam_date", { ascending: true }).limit(100),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("viva_sessions").select("*").order("created_at", { ascending: false }).limit(10),
  ]);
  const names = new Map(((subjects ?? []) as Subject[]).map((s) => [s.id, s.name]));
  const vivaExams: VivaExam[] = ((exams ?? []) as Exam[]).map((e) => ({
    id: e.id,
    name: e.subject_id ? (names.get(e.subject_id) ?? "Untitled exam") : "Untitled exam",
    syllabus: e.syllabus,
    weak_topics: e.weak_topics,
  }));
  const history = (sessions ?? []) as VivaSession[];

  return (
    <>
      <PageHeader
        title="Viva Practice"
        subtitle="Answer oral-style questions and get scored feedback."
      />
      <VivaManager exams={vivaExams} />

      {history.length > 0 && (
        <div className="mx-auto mt-8 max-w-3xl">
          <h2 className="mb-3 text-base font-semibold text-ink">Past sessions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Icon name="chat" className="h-4 w-4 shrink-0 text-primary" />
                  <h3 className="truncate text-sm font-semibold text-ink">{s.topic}</h3>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {new Date(s.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {s.score !== null ? ` · Score ${s.score}/5` : ""}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
