import Link from "next/link";
import { summarizeXp, type XpEvent } from "@/lib/xp";
import type { Internship } from "@/lib/types";
import { Badge, Card, Icon, ProgressBar } from "./ui";

/* ------------------------------ Phase 4: XP ------------------------------ */

export function XpCard({ events }: { events: XpEvent[] }) {
  const s = summarizeXp(events, 0);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="trophy" className="h-5 w-5 text-warning" />
          Level {s.level}
        </h2>
        <Badge tone="info">{s.totalXp.toLocaleString()} XP</Badge>
      </div>
      <div className="mt-3">
        <ProgressBar
          value={s.progress * 100}
          tone="info"
          label={`${s.intoLevel.toLocaleString()} / ${s.neededForNext.toLocaleString()} XP to Level ${s.level + 1}`}
        />
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <p className="text-muted">
          Today <span className="font-semibold text-ink">+{s.todayXp}</span>
          <span className="mx-1.5 text-line">·</span>
          This week <span className="font-semibold text-ink">+{s.weekXp}</span>
        </p>
        <Link href="/analytics" className="font-semibold text-primary hover:underline">
          Details →
        </Link>
      </div>
    </Card>
  );
}

/* -------------------------- Phase 4: Applications ------------------------- */

const WIDGET_STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "success"> = {
  wishlist: "neutral",
  applied: "info",
  screening: "warning",
  interview: "warning",
  offer: "success",
};

export function ApplicationsWidget({ internships }: { internships: Internship[] }) {
  const active = internships.filter((i) => i.status !== "accepted" && i.status !== "rejected");
  const withDeadlines = active
    .filter((i) => i.deadline)
    .sort((a, b) => (a.deadline as string).localeCompare(b.deadline as string));
  const next = withDeadlines[0];
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
          <Icon name="briefcase" className="h-5 w-5 text-primary" />
          Applications
        </h2>
        <Badge tone={active.length > 0 ? "info" : "neutral"}>
          {active.length} active
        </Badge>
      </div>
      {active.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          No active applications.{" "}
          <Link href="/internships" className="font-semibold text-primary hover:underline">
            Start tracking →
          </Link>
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-2">
            {active.slice(0, 3).map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium">{i.company}</span>
                  <span className="text-muted"> · {i.role}</span>
                </span>
                <Badge tone={WIDGET_STATUS_TONE[i.status] ?? "neutral"}>{i.status}</Badge>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between text-sm">
            <p className="text-muted">
              {next?.deadline
                ? `Next deadline: ${new Date(next.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
                : "No deadlines set"}
            </p>
            <Link href="/internships" className="font-semibold text-primary hover:underline">
              Open tracker →
            </Link>
          </div>
        </>
      )}
    </Card>
  );
}
