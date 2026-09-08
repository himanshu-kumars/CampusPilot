import { redirect } from "next/navigation";
import { NotesManager } from "@/components/notes";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Note, Subject } from "@/lib/types";

export default async function NotesPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Notes" subtitle="Upload, summarize and quiz yourself on your material." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/notes");

  const supabase = await createClient();
  const [{ data: notes }, { data: subjects }] = await Promise.all([
    supabase.from("notes").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("subjects").select("*").order("name"),
  ]);

  return (
    <>
      <PageHeader
        title="Notes"
        subtitle="Upload PDFs or paste text — then summarize and turn them into practice."
      />
      <NotesManager notes={(notes ?? []) as Note[]} subjects={(subjects ?? []) as Subject[]} />
    </>
  );
}
