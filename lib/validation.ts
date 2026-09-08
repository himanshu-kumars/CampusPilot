import { z } from "zod";

/* ------------------------- CRUD input schemas ------------------------- */

export const subjectSchema = z
  .object({
    name: z.string().trim().min(1, "Subject name is required.").max(80),
    attended: z.coerce.number().int().min(0, "Attended classes cannot be negative."),
    total: z.coerce.number().int().min(0, "Total classes cannot be negative."),
    target_attendance: z.coerce.number().int().min(1).max(100).default(75),
  })
  .refine((d) => d.attended <= d.total, {
    message: "Attended classes cannot exceed total classes.",
    path: ["attended"],
  });

export const assignmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  subject_id: z.string().uuid().nullable().optional(),
  deadline: z.string().min(1, "Deadline is required."),
  priority: z.enum(["high", "medium", "low"]),
  status: z.enum(["pending", "in_progress", "completed"]).default("pending"),
  description: z.string().max(2000).nullable().optional(),
});

export const examSchema = z.object({
  subject_id: z.string().uuid().nullable().optional(),
  exam_date: z.string().min(1, "Exam date is required."),
  preparation_percent: z.coerce.number().int().min(0).max(100),
  syllabus: z.string().max(5000).nullable().optional(),
  weak_topics: z.string().max(2000).nullable().optional(),
});

export const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required.").max(80),
  college: z.string().trim().max(120).nullable().optional(),
  semester: z.string().trim().max(20).nullable().optional(),
});

/* --------------------- Study-plan request schema ---------------------- */

export const studyPlanRequestSchema = z.object({
  examId: z.string().uuid("A valid exam is required."),
  availableHoursPerDay: z.coerce
    .number()
    .min(0.5, "Available hours must be at least 0.5.")
    .max(16, "Available hours cannot exceed 16 per day."),
  preparationPercent: z.coerce.number().int().min(0).max(100),
  syllabus: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  weakTopics: z.array(z.string().trim().min(1).max(200)).max(60).default([]),
  emergency: z.boolean().default(false),
});

export type StudyPlanRequest = z.infer<typeof studyPlanRequestSchema>;

/* --------------------- Study-plan AI output schema -------------------- */
/* Mirrors 29_STUDY_PLAN_SCHEMA.json. Every AI response must validate.   */

export const studyPlanOutputSchema = z.object({
  summary: z.string().min(1),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  total_hours: z.number().min(0),
  days: z
    .array(
      z.object({
        date: z.string().min(1),
        focus: z.string().min(1),
        tasks: z
          .array(
            z.object({
              title: z.string().min(1),
              duration_minutes: z.number().int().min(1).max(720),
              type: z.enum(["learn", "practice", "revision", "mock", "break"]),
              priority: z.enum(["high", "medium", "low"]),
            })
          )
          .min(1),
      })
    )
    .min(1),
  final_revision: z.array(z.string()),
  tips: z.array(z.string()),
});

export type StudyPlan = z.infer<typeof studyPlanOutputSchema>;

/* ------------------------------- helpers ------------------------------ */

/** Split free-text (one item per line) into a clean list. */
export function linesToList(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 60);
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check your input and try again.";
}

/* --------------------------- Phase 2: notes -------------------------------- */

export const noteSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(120),
  subject_id: z.string().uuid().nullable().optional(),
  content_text: z.string().trim().min(1, "Notes cannot be empty.").max(60000),
  file_name: z.string().max(255).nullable().optional(),
});

export const summarizeRequestSchema = z.object({
  noteId: z.string().uuid("A valid note is required."),
});

export const noteSummarySchema = z.object({
  summary: z.string().min(1),
  key_points: z.array(z.string()),
  terms: z.array(z.object({ term: z.string(), definition: z.string() })),
  suggested_questions: z.array(z.string()),
});

export type NoteSummary = z.infer<typeof noteSummarySchema>;

/* -------------------------- Phase 2: questions ----------------------------- */

export const questionsRequestSchema = z
  .object({
    examId: z.string().uuid().optional(),
    noteId: z.string().uuid().optional(),
    count: z.coerce.number().int().min(3).max(15).default(8),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
  })
  .refine((d) => d.examId || d.noteId, {
    message: "Pick an exam or a note to generate questions from.",
  });

export const practiceQuestionSchema = z.object({
  question: z.string().min(1),
  type: z.enum(["mcq", "short"]),
  options: z.array(z.string()).max(6).optional(),
  answer: z.string().min(1),
  explanation: z.string().min(1),
});

export const questionsOutputSchema = z.object({
  questions: z.array(practiceQuestionSchema).min(1),
});

export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;

/* ---------------------------- Phase 2: viva -------------------------------- */

export const vivaRequestSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  context: z.string().max(4000).default(""),
  history: z
    .array(z.object({ role: z.enum(["ai", "student"]), content: z.string().max(4000) }))
    .max(30)
    .default([]),
  userAnswer: z.string().max(2000).optional(),
  questionNumber: z.coerce.number().int().min(1).default(1),
  totalQuestions: z.coerce.number().int().min(1).max(12).default(5),
});

export const vivaOutputSchema = z.object({
  feedback: z.string(),
  score: z.number().int().min(1).max(5).nullable(),
  next_question: z.string().min(1),
  done: z.boolean(),
});

export type VivaTurn = z.infer<typeof vivaOutputSchema>;

/* --------------------------- Phase 2: events ------------------------------- */

export const eventSchema = z.object({
  kind: z.enum(["study_task_completed", "viva_question_answered"]),
  label: z.string().trim().min(1).max(200),
});

/* --------------------------- Phase 3: timetable ---------------------------- */

export const timetableEntrySchema = z
  .object({
    subject_id: z.string().uuid("Pick a subject."),
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM."),
    end_time: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM."),
    room: z.string().max(60).nullable().optional(),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: "End time must be after start time.",
    path: ["end_time"],
  });

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/* ----------------------------- Phase 3: groups ----------------------------- */

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Group name is required.").max(60),
  description: z.string().trim().max(500).nullable().optional(),
});

export const joinGroupSchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Invite codes are 6 characters.")
    .transform((s) => s.toUpperCase()),
});

export const groupTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(140),
  details: z.string().trim().max(1000).nullable().optional(),
  due_date: z.string().nullable().optional(),
});

/* ----------------------------- Phase 3: sharing ---------------------------- */

export const shareLinkSchema = z.object({
  label: z.string().trim().max(60).nullable().optional(),
  days: z.coerce.number().int().refine((n) => [0, 7, 14, 30].includes(n), {
    message: "Pick an expiry.",
  }),
});

/* --------------------------- Phase 4: internships -------------------------- */

export const INTERNSHIP_STATUSES = [
  "wishlist",
  "applied",
  "screening",
  "interview",
  "offer",
  "accepted",
  "rejected",
] as const;

export const internshipSchema = z.object({
  company: z.string().trim().min(1, "Company is required.").max(120),
  role: z.string().trim().min(1, "Role is required.").max(120),
  status: z.enum(INTERNSHIP_STATUSES).default("wishlist"),
  deadline: z.string().nullable().optional(),
  link: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(120).nullable().optional(),
  stipend: z.string().trim().max(60).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
