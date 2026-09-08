import { redirect } from "next/navigation";
import { InterviewChecklist, PlacementManager } from "@/components/placement";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { PracticeSet } from "@/lib/types";

export default async function PlacementPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Placement Prep" subtitle="Aptitude, technicals, and HR — drilled the honest way." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/placement");

  const supabase = await createClient();
  const { data: sets } = await supabase
    .from("practice_sets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Placement Prep"
        subtitle="Aptitude, technicals, and HR — drilled the honest way."
      />
      <PlacementManager sets={(sets ?? []) as PracticeSet[]} />
      <InterviewChecklist />
    </>
  );
}
