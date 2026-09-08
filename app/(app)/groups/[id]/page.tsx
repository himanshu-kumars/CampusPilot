import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GroupDetail } from "@/components/groups";
import { PageHeader, SetupRequired } from "@/components/ui";
import { createClient, getSessionUser, supabaseConfigured } from "@/lib/supabase/server";
import type { GroupMember, GroupTask, StudyGroup } from "@/lib/types";

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  if (!supabaseConfigured()) {
    return (
      <>
        <PageHeader title="Study Group" subtitle="Shared goals, visible progress." />
        <SetupRequired />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/groups");
  const { id } = await params;

  const supabase = await createClient();
  const { data: group } = await supabase.from("study_groups").select("*").eq("id", id).maybeSingle();
  if (!group) notFound();
  const g = group as StudyGroup;

  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase.rpc("list_group_members", { p_group_id: id }),
    supabase.from("group_tasks").select("*").eq("group_id", id).order("created_at", { ascending: true }),
  ]);

  return (
    <>
      <PageHeader
        title={g.name}
        subtitle={g.description || "Study together, stay accountable."}
        action={
          <Link
            href="/groups"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-slate-50"
          >
            All groups
          </Link>
        }
      />
      <GroupDetail
        group={g}
        members={((members ?? []) as GroupMember[]).map((m) => ({ ...m, group_id: id }))}
        tasks={(tasks ?? []) as GroupTask[]}
        userId={user.id}
        isOwner={g.owner_id === user.id}
      />
    </>
  );
}
