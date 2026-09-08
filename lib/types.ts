/** Shared database row types (mirrors 07_DATABASE_SCHEMA.sql). */

export interface Profile {
  id: string;
  full_name: string;
  college: string | null;
  semester: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  target_attendance: number;
  attended: number;
  total: number;
  created_at: string;
  updated_at: string;
}

export type AssignmentPriority = "high" | "medium" | "low";
export type AssignmentStatus = "pending" | "in_progress" | "completed";

export interface Assignment {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  description: string | null;
  deadline: string;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_id: string | null;
  exam_date: string;
  preparation_percent: number;
  syllabus: string | null;
  weak_topics: string | null;
  created_at: string;
  updated_at: string;
}

export type InternshipStatus =
  | "wishlist"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "accepted"
  | "rejected";

export interface Internship {
  id: string;
  user_id: string;
  company: string;
  role: string;
  status: InternshipStatus;
  deadline: string | null;
  link: string | null;
  location: string | null;
  stipend: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyPlanRecord {
  id: string;
  user_id: string;
  exam_id: string | null;
  input_snapshot: unknown;
  plan: unknown;
  created_at: string;
}

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

/* ------------------------------ Phase 2 rows ------------------------------ */

export interface Note {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  file_name: string | null;
  content_text: string;
  summary: unknown | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeSet {
  id: string;
  user_id: string;
  exam_id: string | null;
  note_id: string | null;
  title: string;
  difficulty: string;
  questions: unknown;
  best_score: number | null;
  attempts: number;
  created_at: string;
}

export interface VivaSession {
  id: string;
  user_id: string;
  exam_id: string | null;
  topic: string;
  transcript: unknown;
  score: number | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  user_id: string;
  kind: string;
  label: string;
  created_at: string;
}

/* ------------------------------ Phase 3 rows ------------------------------ */

export interface TimetableEntry {
  id: string;
  user_id: string;
  subject_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  room: string | null;
  created_at: string;
}

export interface ShareLink {
  id: string;
  user_id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  code: string;
  owner_id: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  display_name: string;
  joined_at: string;
}

export interface GroupTask {
  id: string;
  group_id: string;
  created_by: string;
  title: string;
  details: string | null;
  due_date: string | null;
  status: "pending" | "completed";
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}
