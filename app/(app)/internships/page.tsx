import { redirect } from "next/navigation";
import { InternshipBoard, InternshipDialogButton } from "@/components/internships";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Internship } from "@/lib/types";

export default async function InternshipsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Internships" subtitle="Every application, from wishlist to offer." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/internships");

  const supabase = await createClient();
  const { data: internships } = await supabase
    .from("internships")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Internships"
        subtitle="Every application, from wishlist to offer."
        action={<InternshipDialogButton />}
      />
      <InternshipBoard internships={(internships ?? []) as Internship[]} />
    </>
  );
}
