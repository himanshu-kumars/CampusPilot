import { NextResponse } from "next/server";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import type { Assignment, Exam } from "@/lib/types";

function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function toStamp(iso: string): string {
  return `${new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function toDay(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Downloadable calendar feed (import into Google/Apple/Outlook calendar). */
export async function GET() {
  if (!supabaseConfigured()) {
    return new NextResponse("Supabase is not configured.", { status: 503 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const [{ data: assignments }, { data: exams }] = await Promise.all([
    supabase.from("assignments").select("*").eq("user_id", user.id).neq("status", "completed"),
    supabase.from("exams").select("*").eq("user_id", user.id),
  ]);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CampusPilot//Academic Calendar//EN",
    "CALSCALE:GREGORIAN",
    "X-WR-CALNAME:CampusPilot",
  ];
  const stamp = toStamp(new Date().toISOString());

  for (const a of ((assignments ?? []) as Assignment[])) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:assignment-${a.id}@campuspilot`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${toStamp(a.deadline)}`,
      `SUMMARY:${esc(`Assignment due: ${a.title} (${a.priority} priority)`)}`,
      `DESCRIPTION:${esc(a.description ?? "")}`,
      "END:VEVENT"
    );
  }
  for (const e of ((exams ?? []) as Exam[])) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:exam-${e.id}@campuspilot`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toDay(e.exam_date)}`,
      `SUMMARY:${esc(`Exam (prep ${e.preparation_percent}%)`)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="campuspilot-calendar.ics"',
    },
  });
}
