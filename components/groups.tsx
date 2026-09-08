"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createGroup,
  createGroupTask,
  deleteGroupTask,
  joinGroup,
  leaveGroup,
  toggleGroupTask,
} from "@/lib/actions";
import type { GroupMember, GroupTask, StudyGroup } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  FormError,
  Icon,
  Input,
  Modal,
  Textarea,
  cx,
  toast,
} from "./ui";

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} copied.`);
  } catch {
    toast("Copy failed — select the text manually.", "error");
  }
}

export function GroupsManager({
  groups,
  counts,
}: {
  groups: StudyGroup[];
  counts: Record<string, number>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [creating, startCreate] = useTransition();
  const [joining, startJoin] = useTransition();
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [code, setCode] = useState("");

  const onCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    startCreate(async () => {
      const res = await createGroup(form);
      if (res.ok) {
        toast("Group created.");
        setForm({ name: "", description: "" });
        setCreateOpen(false);
        window.location.href = `/groups/${res.data}`;
      } else setCreateError(res.error);
    });
  };

  const onJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    startJoin(async () => {
      const res = await joinGroup({ code });
      if (res.ok) {
        toast("Welcome to the group.");
        setCode("");
        setJoinOpen(false);
        window.location.href = `/groups/${res.data}`;
      } else setJoinError(res.error);
    });
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setCreateOpen(true)}>
          <Icon name="plus" className="h-4 w-4" />
          Create group
        </Button>
        <Button variant="secondary" onClick={() => setJoinOpen(true)}>
          Join with code
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon="users"
          title="No study groups yet"
          body="Create a group and share the invite code, or join your friends with theirs."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Icon name="plus" className="h-4 w-4" />
              Create your first group
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="block transition-transform duration-150 hover:-translate-y-0.5">
              <Card>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="truncate text-base font-semibold text-ink">{g.name}</h3>
                  <Badge tone="neutral" icon="users">
                    {counts[g.id] ?? 1}
                  </Badge>
                </div>
                {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1 font-mono text-sm font-bold tracking-widest text-ink">
                  {g.code}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create study group">
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Group name" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Sem 3 CSA" maxLength={60} required />
          </Field>
          <Field label="Description" hint="What will this group focus on?">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
          </Field>
          <FormError message={createError} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={creating}>
              Create & get code
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={joinOpen} onClose={() => setJoinOpen(false)} title="Join with invite code">
        <form onSubmit={onJoin} className="space-y-4">
          <Field label="Invite code" required hint="6 characters, e.g. K7Q2XA.">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="XXXXXX"
              className="text-center font-mono text-lg tracking-[0.3em] uppercase"
              maxLength={6}
              required
            />
          </Field>
          <FormError message={joinError} />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" fullWidth onClick={() => setJoinOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={joining}>
              Join group
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export function GroupDetail({
  group,
  members,
  tasks,
  userId,
  isOwner,
}: {
  group: StudyGroup;
  members: GroupMember[];
  tasks: GroupTask[];
  userId: string;
  isOwner: boolean;
}) {
  const [taskForm, setTaskForm] = useState({ title: "", details: "", due_date: "" });
  const [taskError, setTaskError] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const [toggling, startToggle] = useTransition();
  const [leaving, startLeave] = useTransition();
  void userId;

  const names = new Map(members.map((m) => [m.user_id, m.display_name]));
  const open = tasks.filter((t) => t.status !== "completed");
  const done = tasks.filter((t) => t.status === "completed");
  const board = new Map<string, number>();
  for (const t of done) board.set(t.completed_by ?? "?", (board.get(t.completed_by ?? "?") ?? 0) + 1);
  const leaders = [...board.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    startAdd(async () => {
      const res = await createGroupTask(group.id, taskForm);
      if (res.ok) {
        setTaskForm({ title: "", details: "", due_date: "" });
        toast("Task added.");
      } else setTaskError(res.error);
    });
  };

  const toggle = (task: GroupTask) => {
    startToggle(async () => {
      const res = await toggleGroupTask(task.id, group.id);
      if (!res.ok) toast(res.error, "error");
    });
  };

  const remove = (task: GroupTask) => {
    startToggle(async () => {
      const res = await deleteGroupTask(task.id, group.id);
      if (!res.ok) toast(res.error, "error");
      else toast("Task deleted.");
    });
  };

  const leave = () => {
    if (!window.confirm("Leave this group? You can rejoin anytime with the invite code.")) return;
    startLeave(async () => {
      const res = await leaveGroup(group.id);
      if (res.ok) window.location.href = "/groups";
      else toast(res.error, "error");
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card>
          <h2 className="text-base font-semibold text-ink">Add a shared task</h2>
          <form onSubmit={addTask} className="mt-3 space-y-3">
            <Field label="Title" required>
              <Input value={taskForm.title} onChange={(e) => setTaskForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Finish Unit 2 problem set" maxLength={140} required />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Due date">
                <Input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((f) => ({ ...f, due_date: e.target.value }))} />
              </Field>
              <Field label="Details">
                <Input value={taskForm.details} onChange={(e) => setTaskForm((f) => ({ ...f, details: e.target.value }))} placeholder="Optional" maxLength={200} />
              </Field>
            </div>
            <FormError message={taskError} />
            <Button type="submit" loading={adding}>
              <Icon name="plus" className="h-4 w-4" />
              Add task
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="mb-2 text-base font-semibold text-ink">Open ({open.length})</h2>
          {open.length === 0 ? (
            <Card>
              <p className="text-sm text-muted">Nothing open. Add the group&apos;s next goal above.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {open.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox aria-label={`Complete ${t.title}`} checked={false} disabled={toggling} onChange={() => toggle(t)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{t.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Added by {names.get(t.created_by) ?? "a member"}
                        {t.due_date ? ` · Due ${new Date(t.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : ""}
                        {t.details ? ` · ${t.details}` : ""}
                      </p>
                    </div>
                    <button type="button" disabled={toggling} onClick={() => remove(t)} aria-label={`Delete ${t.title}`} className="cursor-pointer rounded-lg p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-60">
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {done.length > 0 && (
          <div>
            <h2 className="mb-2 text-base font-semibold text-ink">Completed ({done.length})</h2>
            <div className="space-y-2">
              {done.map((t) => (
                <Card key={t.id} className="p-4 opacity-75">
                  <div className="flex items-start gap-3">
                    <Checkbox aria-label={`Reopen ${t.title}`} checked disabled={toggling} onChange={() => toggle(t)} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink line-through">{t.title}</p>
                      <p className="mt-0.5 text-xs text-muted">Completed by {names.get(t.completed_by ?? "") ?? "a member"}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <h3 className="text-sm font-bold tracking-wider text-muted uppercase">Invite code</h3>
          <button
            type="button"
            onClick={() => copyText(group.code, "Invite code")}
            className="mt-2 flex w-full cursor-pointer items-center justify-between rounded-xl bg-canvas px-4 py-3 transition-colors hover:bg-slate-100"
            aria-label="Copy invite code"
          >
            <span className="font-mono text-xl font-bold tracking-[0.25em] text-ink">{group.code}</span>
            <Icon name="tasks" className="h-4 w-4 text-muted" />
          </button>
          <p className="mt-2 text-xs text-muted">Share this code — anyone with it can join.</p>
        </Card>

        <Card>
          <h3 className="text-sm font-bold tracking-wider text-muted uppercase">Members ({members.length})</h3>
          <ul className="mt-3 space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2.5 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-primary">
                  {m.display_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{m.display_name}</span>
                {m.user_id === group.owner_id && <Badge tone="info">Owner</Badge>}
              </li>
            ))}
          </ul>
        </Card>

        {leaders.length > 0 && (
          <Card>
            <h3 className="text-sm font-bold tracking-wider text-muted uppercase">Leaderboard</h3>
            <ol className="mt-3 space-y-2">
              {leaders.map(([id, count], i) => (
                <li key={id} className="flex items-center gap-2 text-sm">
                  <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", i === 0 ? "bg-warning/15 text-warning" : "bg-slate-100 text-muted")}>
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-ink">{names.get(id) ?? "Member"}</span>
                  <span className="text-xs text-muted">{count} done</span>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <Card>
          <Button variant="secondary" fullWidth loading={leaving} onClick={leave}>
            Leave group
          </Button>
          {isOwner && (
            <p className="mt-2 text-xs text-muted">Owners: leaving removes you from the member list but the group stays for everyone else.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
