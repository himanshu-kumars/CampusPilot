import { redirect } from "next/navigation";
import { FeeBoard, FeeDialogButton } from "@/components/fees";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { Fee } from "@/lib/types";

export default async function FeesPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Fees" subtitle="Tuition, hostel, mess — never miss a due date." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/fees");

  const supabase = await createClient();
  const { data: fees } = await supabase
    .from("fees")
    .select("*")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(200);

  return (
    <>
      <PageHeader
        title="Fees"
        subtitle="Tuition, hostel, mess — never miss a due date."
        action={<FeeDialogButton />}
      />
      <FeeBoard fees={(fees ?? []) as Fee[]} />
    </>
  );
}
