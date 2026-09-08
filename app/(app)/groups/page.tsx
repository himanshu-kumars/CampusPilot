import { redirect } from "next/navigation";
import { GroupsManager } from "@/components/groups";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { GroupMember, StudyGroup } from "@/lib/types";

export default async function GroupsPage() {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Study Groups" subtitle="Plan together, stay accountable." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/groups");

  const supabase = await createClient();
  // Groups I own…
  const { data: owned } = await supabase.from("study_groups").select("*").eq("owner_id", user.id);
  // …plus groups I'm a member of.
  const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", user.id);
  const memberIds = ((memberships ?? []) as { group_id: string }[]).map((m) => m.group_id);
  const ownedIds = new Set(((owned ?? []) as StudyGroup[]).map((g) => g.id));
  const extraIds = memberIds.filter((id) => !ownedIds.has(id));
  const { data: joined } = extraIds.length
    ? await supabase.from("study_groups").select("*").in("id", extraIds)
    : { data: [] as StudyGroup[] };

  const groups = [...((owned ?? []) as StudyGroup[]), ...((joined ?? []) as StudyGroup[])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Member counts (best effort — owners can always read these).
  const counts: Record<string, number> = {};
  for (const g of groups) {
    try {
      const { data } = await supabase.rpc("list_group_members", { p_group_id: g.id });
      counts[g.id] = Array.isArray(data) ? (data as GroupMember[]).length : 1;
    } catch {
      counts[g.id] = 1;
    }
  }

  return (
    <>
      <PageHeader
        title="Study Groups"
        subtitle="Shared goals, visible progress, friendly accountability."
      />
      <GroupsManager groups={groups} counts={counts} />
    </>
  );
}
