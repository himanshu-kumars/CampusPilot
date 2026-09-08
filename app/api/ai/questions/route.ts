import { NextResponse, type NextRequest } from "next/server";
import { AINotConfiguredError, AIValidationError, generateQuestions } from "@/lib/ai";
import { logEvent } from "@/lib/events";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { TRACK_META, firstError, questionsRequestSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured." },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }
  const parsed = questionsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: firstError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "You must be logged in." }, { status: 401 });
  }

  let title = "";
  let context = "";
  let noteContent: string | null = null;
  let examId: string | null = null;
  let noteId: string | null = null;

  if (input.noteId) {
    const { data: note } = await supabase
      .from("notes")
      .select("*")
      .eq("id", input.noteId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!note) {
      return NextResponse.json({ success: false, error: "Note not found." }, { status: 404 });
    }
    title = note.title as string;
    noteContent = note.content_text as string;
    context = `Notes titled "${title}":\n${noteContent.slice(0, 20000)}`;
    noteId = note.id as string;
  } else if (input.examId) {
    const { data: exam } = await supabase
      .from("exams")
      .select("*, subjects(name)")
      .eq("id", input.examId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
    }
    title = ((exam.subjects as { name?: string } | null)?.name ?? "Exam") as string;
    context = [
      `Exam subject: ${title}`,
      `Preparation: ${exam.preparation_percent}%`,
      `Syllabus/topics:\n${(exam.syllabus as string) || "(not provided)"}`,
      `Weak topics:\n${(exam.weak_topics as string) || "(none listed)"}`,
    ].join("\n\n");
    examId = exam.id as string;
  } else if (input.track) {
    const meta = TRACK_META[input.track];
    title = `Placement: ${meta.label}`;
    context = [
      `Placement preparation track: ${meta.label}.`,
      `Coverage: ${meta.blurb}`,
      input.track === "hr"
        ? "Format: short-answer HR questions a candidate must answer in 1–2 minutes. The 'answer' field should be bullet guidance on a strong response, and 'explanation' the reasoning behind it."
        : "Format: mix MCQ (4 options) and short questions exactly like campus placement tests. Keep questions self-contained — no external material.",
      "Keep difficulty realistic for tier-2/tier-3 college placements unless 'hard' is requested.",
    ].join("\n\n");
  }

  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("activity_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("kind", "ai_questions")
    .gt("created_at", hourAgo);
  if ((count ?? 0) >= 20) {
    return NextResponse.json(
      { success: false, error: "Too many question sets recently. Please wait a little and try again." },
      { status: 429 }
    );
  }

  try {
    const { questions, source } = await generateQuestions({
      title,
      context,
      noteContent,
      count: input.count,
      difficulty: input.difficulty,
    });
    const { data: saved, error: saveError } = await supabase
      .from("practice_sets")
      .insert({
        user_id: user.id,
        exam_id: examId,
        note_id: noteId,
        title: `${title} — ${questions.length} questions`,
        difficulty: input.difficulty,
        questions,
      })
      .select("id")
      .single();
    if (saveError) console.error("practice_sets insert failed", saveError);
    await logEvent(supabase, user.id, "ai_questions", `Generated ${questions.length} questions for “${title}”`);
    return NextResponse.json({
      success: true,
      setId: (saved as { id: string } | null)?.id ?? null,
      questions,
      source,
    });
  } catch (e) {
    console.error("ai/questions failed", e);
    if (e instanceof AINotConfiguredError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 503 });
    }
    if (e instanceof AIValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 422 });
    }
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("AI provider error") || message.includes("empty response")) {
      return NextResponse.json(
        { success: false, error: "The AI service is unavailable right now. Try again in a bit." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Something went wrong while generating questions. Try again." },
      { status: 500 }
    );
  }
}
