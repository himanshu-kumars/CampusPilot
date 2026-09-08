"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, supabaseConfigured } from "./supabase/server";

// Deep import: pdf-parse's package root runs test-fixture code when bundled
// (reads ./test/data/*.pdf). lib/pdf-parse.js is the clean parser entry.
const pdf = require("pdf-parse/lib/pdf-parse.js") as typeof import("pdf-parse");
import { logEvent } from "./events";
import {
  assignmentSchema,
  examSchema,
  feedbackReplySchema,
  feeSchema,
  firstError,
  groupSchema,
  groupTaskSchema,
  internshipSchema,
  joinGroupSchema,
  listingSchema,
  noteSchema,
  profileSchema,
  shareLinkSchema,
  subjectSchema,
  timetableEntrySchema,
} from "./validation";
import type {
  ActionResult,
  Assignment,
  Exam,
  Fee,
  Internship,
  Listing,
  Profile,
  Subject,
} from "./types";

const NOT_CONFIGURED = "Supabase is not configured. Add your environment variables to use this feature.";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be logged in to do that.");
  return { supabase, user };
}

function dbError(message: string, err: unknown): { ok: false; error: string } {
  console.error(message, err);
  return { ok: false, error: "Could not save your data. Check your connection and try again." };
}

/** True when a PostgREST error means "table doesn't exist" (migrations not run). */
export function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = (err as { code?: unknown }).code;
  const message = String((err as { message?: unknown }).message ?? "");
  return (
    code === "PGRST205" ||
    /could not find the table|schema cache|relation .* does not exist/i.test(message)
  );
}

/* ------------------------------ Auth/Profile ------------------------------ */

export async function signOut(): Promise<void> {
  if (supabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

/** Ensure a profile row exists for the current user (used after signup/login). */
export async function ensureProfile(): Promise<Profile | null> {
  if (!supabaseConfigured()) return null;
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (data) return data as Profile;
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      full_name: meta.full_name || "Student",
      college: meta.college || null,
      semester: meta.semester || null,
    })
    .select("*")
    .single();
  if (error) {
    // Missing table = setup step skipped. Warn (no scary red overlay) with the fix.
    if (isMissingTableError(error)) {
      console.warn(
        "[setup] profiles table missing — run 07_DATABASE_SCHEMA.sql (then 002–006) in the Supabase SQL Editor."
      );
    } else {
      console.error("ensureProfile failed", JSON.stringify(error));
    }
    return null;
  }
  return created as Profile;
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("profiles")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", user.id);
    if (error) return dbError("updateProfile", error);
    revalidatePath("/settings");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* -------------------------------- Subjects -------------------------------- */

const SUBJECT_PATHS = ["/attendance", "/dashboard", "/assignments", "/exams"];

export async function createSubject(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("subjects").insert({
      user_id: user.id,
      ...parsed.data,
    });
    if (error) return dbError("createSubject", error);
    await logEvent(supabase, user.id, "subject_created", `Added subject “${parsed.data.name}”`);
    SUBJECT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateSubject(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = subjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("subjects")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateSubject", error);
    SUBJECT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/** Record one more class: present increments attended+total, absent increments total. */
export async function recordClass(
  subject: Subject,
  present: boolean
): Promise<ActionResult> {
  const res = await updateSubject(subject.id, {
    name: subject.name,
    attended: subject.attended + (present ? 1 : 0),
    total: subject.total + 1,
    target_attendance: subject.target_attendance,
  });
  if (res.ok) {
    try {
      const { supabase, user } = await requireUser();
      await logEvent(
        supabase,
        user.id,
        "class_recorded",
        `Marked ${present ? "present" : "absent"} in “${subject.name}”`
      );
    } catch {
      /* XP logging must never break attendance */
    }
  }
  return res;
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("deleteSubject", error);
    SUBJECT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ------------------------------ Assignments ------------------------------ */

const ASSIGNMENT_PATHS = ["/assignments", "/dashboard", "/study-planner"];

function normalizeAssignment(input: Record<string, unknown>) {
  return {
    ...input,
    subject_id: input.subject_id === "" ? null : input.subject_id,
    description:
      typeof input.description === "string" && input.description.trim() === ""
        ? null
        : input.description,
  };
}

export async function createAssignment(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = assignmentSchema.safeParse(
    normalizeAssignment((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (Number.isNaN(new Date(parsed.data.deadline).getTime())) {
    return { ok: false, error: "Deadline must be a valid date and time." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("assignments").insert({
      user_id: user.id,
      ...parsed.data,
    });
    if (error) return dbError("createAssignment", error);
    await logEvent(supabase, user.id, "assignment_created", `Added assignment “${parsed.data.title}”`);
    ASSIGNMENT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateAssignment(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = assignmentSchema.safeParse(
    normalizeAssignment((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (Number.isNaN(new Date(parsed.data.deadline).getTime())) {
    return { ok: false, error: "Deadline must be a valid date and time." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("assignments")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateAssignment", error);
    ASSIGNMENT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setAssignmentStatus(
  assignment: Assignment,
  status: Assignment["status"]
): Promise<ActionResult> {
  const res = await updateAssignment(assignment.id, {
    title: assignment.title,
    subject_id: assignment.subject_id,
    deadline: assignment.deadline,
    priority: assignment.priority,
    status,
    description: assignment.description,
  });
  if (res.ok && status === "completed" && assignment.status !== "completed") {
    try {
      const { supabase, user } = await requireUser();
      await logEvent(supabase, user.id, "assignment_completed", `Completed “${assignment.title}”`);
    } catch {
      /* XP logging must never break assignments */
    }
  }
  return res;
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("deleteAssignment", error);
    ASSIGNMENT_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* --------------------------------- Exams --------------------------------- */

const EXAM_PATHS = ["/exams", "/dashboard", "/study-planner"];

function normalizeExam(input: Record<string, unknown>) {
  const clean = (v: unknown) =>
    typeof v === "string" && v.trim() === "" ? null : v;
  return {
    ...input,
    subject_id: input.subject_id === "" ? null : input.subject_id,
    syllabus: clean(input.syllabus),
    weak_topics: clean(input.weak_topics),
  };
}

export async function createExam(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = examSchema.safeParse(
    normalizeExam((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (Number.isNaN(new Date(parsed.data.exam_date).getTime())) {
    return { ok: false, error: "Exam date must be a valid date." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("exams").insert({
      user_id: user.id,
      ...parsed.data,
    });
    if (error) return dbError("createExam", error);
    await logEvent(supabase, user.id, "exam_created", "Added an exam");
    EXAM_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateExam(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = examSchema.safeParse(
    normalizeExam((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (Number.isNaN(new Date(parsed.data.exam_date).getTime())) {
    return { ok: false, error: "Exam date must be a valid date." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { data: before } = await supabase
      .from("exams")
      .select("preparation_percent")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();
    const { error } = await supabase
      .from("exams")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateExam", error);
    const oldPrep = (before as { preparation_percent?: number } | null)?.preparation_percent;
    if (typeof oldPrep === "number" && oldPrep !== parsed.data.preparation_percent) {
      await logEvent(
        supabase,
        user.id,
        "exam_prep_updated",
        `Preparation ${oldPrep}% → ${parsed.data.preparation_percent}%`
      );
    }
    EXAM_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("deleteExam", error);
    EXAM_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setExamPreparation(
  exam: Exam,
  preparation_percent: number
): Promise<ActionResult> {
  return updateExam(exam.id, {
    subject_id: exam.subject_id,
    exam_date: exam.exam_date,
    preparation_percent,
    syllabus: exam.syllabus,
    weak_topics: exam.weak_topics,
  });
}

/* ------------------------------ Phase 2: Notes ----------------------------- */

const NOTE_PATHS = ["/notes", "/practice", "/analytics"];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

async function insertNote(
  data: { title: string; subject_id: string | null; content_text: string; file_name: string | null }
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("notes").insert({ user_id: user.id, ...data });
    if (error) return dbError("insertNote", error);
    await logEvent(supabase, user.id, "note_created", `Added note “${data.title}”`);
    NOTE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createNoteText(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = noteSchema.safeParse({
    ...raw,
    subject_id: raw.subject_id === "" ? null : raw.subject_id,
    file_name: null,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  return insertNote({
    ...parsed.data,
    subject_id: parsed.data.subject_id ?? null,
    file_name: parsed.data.file_name ?? null,
  });
}

export async function uploadNote(formData: FormData): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const subjectId = String(formData.get("subject_id") ?? "") || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a PDF or text file to upload." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large. Maximum size is 5 MB." };
  }

  let content = "";
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      const parsed = await pdf(buf);
      content = (parsed.text ?? "").trim();
    } else if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
      content = buf.toString("utf-8").trim();
    } else {
      return { ok: false, error: "Only PDF and text files are supported." };
    }
  } catch (e) {
    console.error("uploadNote parse failed", e);
    return { ok: false, error: "Could not read that file. Try a different file or paste the text instead." };
  }
  if (!content) {
    return { ok: false, error: "No readable text found. Scanned PDFs without a text layer can't be processed." };
  }

  const parsed = noteSchema.safeParse({
    title: title || file.name.replace(/\.[^.]+$/, "").slice(0, 120) || "Untitled note",
    subject_id: subjectId,
    content_text: content.slice(0, 60000),
    file_name: file.name.slice(0, 255),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  return insertNote({
    ...parsed.data,
    subject_id: parsed.data.subject_id ?? null,
    file_name: parsed.data.file_name ?? null,
  });
}

export async function deleteNote(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deleteNote", error);
    NOTE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* --------------------------- Phase 2: Practice ----------------------------- */

export async function recordPracticeAttempt(
  setId: string,
  score: number,
  total: number
): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { data } = await supabase
      .from("practice_sets")
      .select("attempts,best_score,title")
      .eq("id", setId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!data) return { ok: false, error: "Practice set not found." };
    const attempts = ((data.attempts as number) ?? 0) + 1;
    const best = Math.max((data.best_score as number) ?? 0, score);
    const { error } = await supabase
      .from("practice_sets")
      .update({ attempts, best_score: best })
      .eq("id", setId)
      .eq("user_id", user.id);
    if (error) return dbError("recordPracticeAttempt", error);
    await logEvent(supabase, user.id, "quiz_completed", `Scored ${score}/${total} on “${data.title}”`);
    ["/practice", "/analytics"].forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deletePracticeSet(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("practice_sets").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deletePracticeSet", error);
    ["/practice", "/analytics"].forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ----------------------------- Phase 2: Viva ------------------------------- */

export async function saveVivaSession(input: {
  exam_id: string | null;
  topic: string;
  transcript: { role: string; content: string }[];
  score: number | null;
}): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  if (!input.topic.trim() || input.transcript.length === 0) {
    return { ok: false, error: "Nothing to save yet." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("viva_sessions").insert({
      user_id: user.id,
      exam_id: input.exam_id,
      topic: input.topic.slice(0, 200),
      transcript: input.transcript,
      score: input.score,
    });
    if (error) return dbError("saveVivaSession", error);
    await logEvent(supabase, user.id, "viva_completed", `Finished viva on “${input.topic.slice(0, 60)}”`);
    ["/viva", "/analytics"].forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ------------------------- Phase 2: Notifications -------------------------- */

const ALL_APP_PATHS = [
  "/dashboard",
  "/attendance",
  "/assignments",
  "/exams",
  "/study-planner",
  "/notes",
  "/practice",
  "/viva",
  "/calendar",
  "/analytics",
  "/settings",
];

export async function dismissAlert(key: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("notification_dismissals")
      .upsert({ user_id: user.id, alert_key: key }, { onConflict: "user_id,alert_key" });
    if (error) return dbError("dismissAlert", error);
    ALL_APP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* --------------------------- Phase 3: Timetable ---------------------------- */

const TIMETABLE_PATHS = ["/timetable", "/dashboard", "/calendar", "/analytics"];

async function timetableOverlap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  day: number,
  start: string,
  end: string,
  excludeId?: string
): Promise<string | null> {
  const { data } = await supabase
    .from("timetable_entries")
    .select("id,start_time,end_time,subjects(name)")
    .eq("user_id", userId)
    .eq("day_of_week", day);
  const rows = (data ?? []) as unknown as {
    id: string;
    start_time: string;
    end_time: string;
    subjects: { name: string } | { name: string }[] | null;
  }[];
  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    if (start < row.end_time && end > row.start_time) {
      const sub = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
      const name = sub?.name ?? "Another class";
      return `${name} (${row.start_time.slice(0, 5)}–${row.end_time.slice(0, 5)}) already occupies that slot.`;
    }
  }
  return null;
}

function normalizeTimetable(input: Record<string, unknown>) {
  return { ...input, room: input.room === "" ? null : input.room };
}

export async function createTimetableEntry(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = timetableEntrySchema.safeParse(
    normalizeTimetable((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const clash = await timetableOverlap(
      supabase, user.id, parsed.data.day_of_week, parsed.data.start_time, parsed.data.end_time
    );
    if (clash) return { ok: false, error: clash };
    const { error } = await supabase.from("timetable_entries").insert({ user_id: user.id, ...parsed.data });
    if (error) return dbError("createTimetableEntry", error);
    TIMETABLE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateTimetableEntry(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = timetableEntrySchema.safeParse(
    normalizeTimetable((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const clash = await timetableOverlap(
      supabase, user.id, parsed.data.day_of_week, parsed.data.start_time, parsed.data.end_time, id
    );
    if (clash) return { ok: false, error: clash };
    const { error } = await supabase
      .from("timetable_entries")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateTimetableEntry", error);
    TIMETABLE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteTimetableEntry(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("timetable_entries").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deleteTimetableEntry", error);
    TIMETABLE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ----------------------------- Phase 3: Groups ----------------------------- */

const GROUP_PATHS = ["/groups", "/analytics"];

function randomCode(length: number, alphabet: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

export async function createGroup(input: unknown): Promise<ActionResult<string>> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = groupSchema.safeParse({ ...raw, description: raw.description === "" ? null : raw.description });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const displayName = ((profile as { full_name?: string } | null)?.full_name ?? "Member").slice(0, 80);

    let groupId: string | null = null;
    for (let attempt = 0; attempt < 4 && !groupId; attempt++) {
      const code = randomCode(6, "ABCDEFGHJKMNPQRSTUVWXYZ23456789");
      const { data, error } = await supabase
        .from("study_groups")
        .insert({ owner_id: user.id, code, ...parsed.data })
        .select("id")
        .single();
      if (!error && data) groupId = (data as { id: string }).id;
      else if (error && !String(error.message).toLowerCase().includes("duplicate") && (error as { code?: string }).code !== "23505") {
        return dbError("createGroup", error);
      }
    }
    if (!groupId) return { ok: false, error: "Could not create the group. Try again." };
    // Owner joins as a member through the code-checked RPC.
    const { data: group } = await supabase.from("study_groups").select("code").eq("id", groupId).single();
    await supabase.rpc("join_group", { p_code: (group as { code: string }).code, p_name: displayName });
    await logEvent(supabase, user.id, "group_created", `Created group “${parsed.data.name}”`);
    GROUP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true, data: groupId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function joinGroup(input: unknown): Promise<ActionResult<string>> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = joinGroupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const displayName = ((profile as { full_name?: string } | null)?.full_name ?? "Member").slice(0, 80);
    const { data, error } = await supabase.rpc("join_group", { p_code: parsed.data.code, p_name: displayName });
    if (error) {
      const msg = error.message.includes("Invalid invite code") ? "That invite code doesn't match any group." : "Could not join the group. Try again.";
      return { ok: false, error: msg };
    }
    await logEvent(supabase, user.id, "group_joined", "Joined a study group");
    GROUP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true, data: data as string };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function leaveGroup(groupId: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    if (error) return dbError("leaveGroup", error);
    GROUP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function createGroupTask(groupId: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = groupTaskSchema.safeParse({
    ...raw,
    details: raw.details === "" ? null : raw.details,
    due_date: raw.due_date === "" ? null : raw.due_date,
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (parsed.data.due_date && Number.isNaN(new Date(parsed.data.due_date).getTime())) {
    return { ok: false, error: "Due date must be a valid date." };
  }
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("group_tasks").insert({
      group_id: groupId,
      created_by: user.id,
      ...parsed.data,
    });
    if (error) return dbError("createGroupTask", error);
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function toggleGroupTask(taskId: string, groupId: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { data: task } = await supabase.from("group_tasks").select("status,title").eq("id", taskId).maybeSingle();
    if (!task) return { ok: false, error: "Task not found." };
    const done = (task as { status: string }).status !== "completed";
    const { error } = await supabase
      .from("group_tasks")
      .update({
        status: done ? "completed" : "pending",
        completed_by: done ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);
    if (error) return dbError("toggleGroupTask", error);
    if (done) await logEvent(supabase, user.id, "group_task_completed", `Completed group task “${(task as { title: string }).title}”`);
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteGroupTask(taskId: string, groupId: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    void user;
    const { error } = await supabase.from("group_tasks").delete().eq("id", taskId);
    if (error) return dbError("deleteGroupTask", error);
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ----------------------------- Phase 3: Sharing ---------------------------- */

export async function createShareLink(input: unknown): Promise<ActionResult<string>> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const raw = (input ?? {}) as Record<string, unknown>;
  const parsed = shareLinkSchema.safeParse({ ...raw, label: raw.label === "" ? null : raw.label });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const token = randomCode(24, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
    const expires_at =
      parsed.data.days === 0 ? null : new Date(Date.now() + parsed.data.days * 86_400_000).toISOString();
    const { error } = await supabase.from("share_links").insert({
      user_id: user.id,
      token,
      label: parsed.data.label ?? null,
      expires_at,
    });
    if (error) return dbError("createShareLink", error);
    await logEvent(supabase, user.id, "share_created", "Created a mentor share link");
    revalidatePath("/settings");
    return { ok: true, data: token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function deleteShareFeedback(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    // Owner-only: the row must belong to one of the user's links (RLS enforces too).
    const { data: links } = await supabase.from("share_links").select("id").eq("user_id", user.id);
    const ids = ((links ?? []) as { id: string }[]).map((l) => l.id);
    if (ids.length === 0) return { ok: false, error: "Feedback not found." };
    const { error } = await supabase.from("share_feedback").delete().eq("id", id).in("share_link_id", ids);
    if (error) return dbError("deleteShareFeedback", error);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function revokeShareLink(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("share_links").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("revokeShareLink", error);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* --------------------------- Phase 4: Internships -------------------------- */

const INTERNSHIP_PATHS = ["/internships", "/dashboard"];

function normalizeInternship(raw: Record<string, unknown>) {
  const emptyToNull = (v: unknown) => (v === "" ? null : v);
  return {
    ...raw,
    deadline: emptyToNull(raw.deadline),
    link: emptyToNull(raw.link),
    location: emptyToNull(raw.location),
    stipend: emptyToNull(raw.stipend),
    notes: emptyToNull(raw.notes),
  };
}

export async function createInternship(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = internshipSchema.safeParse(
    normalizeInternship((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("internships").insert({ ...parsed.data, user_id: user.id });
    if (error) return dbError("createInternship", error);
    await logEvent(supabase, user.id, "internship_added", `Tracking ${parsed.data.role} at ${parsed.data.company}`);
    INTERNSHIP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateInternship(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = internshipSchema.safeParse(
    normalizeInternship((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("internships")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateInternship", error);
    INTERNSHIP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setInternshipStatus(
  internship: Internship,
  status: Internship["status"]
): Promise<ActionResult> {
  const res = await updateInternship(internship.id, {
    company: internship.company,
    role: internship.role,
    status,
    deadline: internship.deadline,
    link: internship.link,
    location: internship.location,
    stipend: internship.stipend,
    notes: internship.notes,
  });
  if (res.ok && status !== internship.status && (status === "offer" || status === "accepted")) {
    try {
      const { supabase, user } = await requireUser();
      await logEvent(
        supabase,
        user.id,
        status === "offer" ? "internship_offer" : "internship_accepted",
        `${status === "offer" ? "Offer" : "Accepted"}: ${internship.role} at ${internship.company}`
      );
    } catch {
      /* XP logging must never break tracking */
    }
  }
  return res;
}

export async function deleteInternship(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("internships").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deleteInternship", error);
    INTERNSHIP_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* --------------------------- Phase 6: Marketplace -------------------------- */

const LISTING_PATHS = ["/marketplace", "/dashboard"];

function normalizeListing(raw: Record<string, unknown>) {
  const emptyToNull = (v: unknown) => (v === "" ? null : v);
  return { ...raw, description: emptyToNull(raw.description), condition: emptyToNull(raw.condition) };
}

export async function createListing(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = listingSchema.safeParse(
    normalizeListing((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("listings").insert({ ...parsed.data, user_id: user.id });
    if (error) return dbError("createListing", error);
    await logEvent(supabase, user.id, "listing_created", `Listed “${parsed.data.title}”`);
    LISTING_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateListing(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = listingSchema.safeParse(
    normalizeListing((input ?? {}) as Record<string, unknown>)
  );
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("listings")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateListing", error);
    LISTING_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setListingStatus(
  listing: Listing,
  status: Listing["status"]
): Promise<ActionResult> {
  return updateListing(listing.id, {
    title: listing.title,
    description: listing.description,
    price: listing.price,
    category: listing.category,
    condition: listing.condition,
    contact: listing.contact,
    status,
  });
}

export async function deleteListing(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("listings").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deleteListing", error);
    LISTING_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ------------------------------ Phase 6: Fees ------------------------------ */

const FEE_PATHS = ["/fees", "/dashboard"];

function normalizeFee(raw: Record<string, unknown>) {
  const emptyToNull = (v: unknown) => (v === "" ? null : v);
  return {
    ...raw,
    due_date: emptyToNull(raw.due_date),
    notes: emptyToNull(raw.notes),
    receipt_text: emptyToNull(raw.receipt_text),
  };
}

export async function createFee(input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = feeSchema.safeParse(normalizeFee((input ?? {}) as Record<string, unknown>));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("fees").insert({ ...parsed.data, user_id: user.id });
    if (error) return dbError("createFee", error);
    await logEvent(supabase, user.id, "fee_added", `Tracking fee “${parsed.data.title}”`);
    FEE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function updateFee(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = feeSchema.safeParse(normalizeFee((input ?? {}) as Record<string, unknown>));
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase
      .from("fees")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return dbError("updateFee", error);
    FEE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setFeeStatus(fee: Fee, status: Fee["status"]): Promise<ActionResult> {
  const res = await updateFee(fee.id, {
    title: fee.title,
    amount: fee.amount,
    due_date: fee.due_date,
    category: fee.category,
    status,
    notes: fee.notes,
    receipt_text: fee.receipt_text,
  });
  if (res.ok && status === "paid" && fee.status !== "paid") {
    try {
      const { supabase, user } = await requireUser();
      await logEvent(supabase, user.id, "fee_paid", `Paid “${fee.title}”`);
    } catch {
      /* XP logging must never break tracking */
    }
  }
  return res;
}

export async function deleteFee(id: string): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.from("fees").delete().eq("id", id).eq("user_id", user.id);
    if (error) return dbError("deleteFee", error);
    FEE_PATHS.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ------------------------- Phase 6: Feedback replies ------------------------ */

export async function replyToFeedback(id: string, input: unknown): Promise<ActionResult> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const parsed = feedbackReplySchema.safeParse((input ?? {}) as Record<string, unknown>);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, user } = await requireUser();
    const { data: links } = await supabase.from("share_links").select("id").eq("user_id", user.id);
    const ids = ((links ?? []) as { id: string }[]).map((l) => l.id);
    if (ids.length === 0) return { ok: false, error: "Feedback not found." };
    const { error } = await supabase
      .from("share_feedback")
      .update({ reply: parsed.data.reply, replied_at: new Date().toISOString() })
      .eq("id", id)
      .in("share_link_id", ids);
    if (error) return dbError("replyToFeedback", error);
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

/* ------------------------- Phase 3: CSV subject import --------------------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const push = () => {
    row.push(cell.trim());
    cell = "";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") push();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      push();
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  push();
  if (row.some((c) => c !== "")) rows.push(row);
  return rows;
}

export async function importSubjectsCSV(formData: FormData): Promise<ActionResult<{ added: number; skipped: number }>> {
  if (!supabaseConfigured()) return { ok: false, error: NOT_CONFIGURED };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a CSV file to import." };
  }
  if (file.size > 256 * 1024) return { ok: false, error: "CSV is too large. Maximum size is 256 KB." };
  let rows: string[][];
  try {
    rows = parseCsv(await file.text()).slice(0, 200);
  } catch {
    return { ok: false, error: "Could not read that CSV file." };
  }
  if (rows.length === 0) return { ok: false, error: "No rows found in that CSV file." };
  // Drop a header row if the second column isn't numeric.
  if (rows.length > 1 && Number.isNaN(Number(rows[0]?.[1]))) rows = rows.slice(1);

  try {
    const { supabase, user } = await requireUser();
    let added = 0;
    let skipped = 0;
    for (const r of rows) {
      const parsed = subjectSchema.safeParse({
        name: r[0] ?? "",
        attended: r[1] ?? 0,
        total: r[2] ?? 0,
        target_attendance: r[3] === undefined || r[3] === "" ? 75 : r[3],
      });
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const { error } = await supabase.from("subjects").insert({ user_id: user.id, ...parsed.data });
      if (error) skipped++;
      else added++;
    }
    await logEvent(supabase, user.id, "csv_imported", `Imported ${added} subject${added === 1 ? "" : "s"} from CSV`);
    SUBJECT_PATHS.forEach((p) => revalidatePath(p));
    revalidatePath("/settings");
    return { ok: true, data: { added, skipped } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
