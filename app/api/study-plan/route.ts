import { NextResponse, type NextRequest } from "next/server";
import { AIValidationError, generatePlan, type PlanInput } from "@/lib/ai";
import { daysUntil } from "@/lib/calculations";
import { logEvent } from "@/lib/events";
import { createClient, supabaseConfigured } from "@/lib/supabase/server";
import { firstError, studyPlanRequestSchema } from "@/lib/validation";

const MAX_GENERATIONS_PER_HOUR = 10;

export async function POST(req: NextRequest) {
  if (!supabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: "Supabase is not configured. Connect a database to generate plans." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = studyPlanRequestSchema.safeParse(body);
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

  // Verify the exam exists and belongs to this user.
  const { data: exam } = await supabase
    .from("exams")
    .select("*, subjects(name)")
    .eq("id", input.examId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!exam) {
    return NextResponse.json({ success: false, error: "Exam not found." }, { status: 404 });
  }

  // Basic per-user abuse protection.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("study_plans")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gt("created_at", hourAgo);
  if ((count ?? 0) >= MAX_GENERATIONS_PER_HOUR) {
    return NextResponse.json(
      { success: false, error: "Too many plans generated recently. Please wait a little and try again." },
      { status: 429 }
    );
  }

  // Assignment workload due around the exam window.
  const { data: workload } = await supabase
    .from("assignments")
    .select("title,deadline")
    .eq("user_id", user.id)
    .neq("status", "completed")
    .order("deadline", { ascending: true })
    .limit(10);

  const subjectName =
    ((exam.subjects as { name?: string } | null)?.name ?? "Upcoming exam") as string;

  const planInput: PlanInput = {
    subject: subjectName,
    examDateISO: exam.exam_date as string,
    daysRemaining: Math.max(daysUntil(exam.exam_date as string), 0),
    availableHoursPerDay: input.availableHoursPerDay,
    preparationPercent: input.preparationPercent,
    syllabus: input.syllabus,
    weakTopics: input.weakTopics,
    assignments: ((workload ?? []) as { title: string; deadline: string }[]).map((w) => ({
      title: w.title,
      deadline: w.deadline,
    })),
    emergency: input.emergency,
  };

  try {
    const { plan, source } = await generatePlan(planInput);

    // Persist (best effort — a save failure must not hide a good plan).
    let planId: string | null = null;
    const { data: saved, error: saveError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        exam_id: input.examId,
        input_snapshot: planInput,
        plan,
      })
      .select("id")
      .single();
    if (saveError) console.error("study_plans insert failed", saveError);
    else planId = (saved as { id: string }).id;

    await logEvent(
      supabase,
      user.id,
      "plan_generated",
      `${input.emergency ? "Emergency plan" : "Study plan"} for ${subjectName}`
    );
    console.info("study-plan generated", {
      user_id: user.id,
      exam_id: input.examId,
      source,
      emergency: input.emergency,
    });
    return NextResponse.json({ success: true, studyPlan: plan, planId, source });
  } catch (e) {
    console.error("study-plan failed", e);
    if (e instanceof AIValidationError) {
      return NextResponse.json({ success: false, error: e.message }, { status: 422 });
    }
    const message = e instanceof Error ? e.message : "";
    if (message.startsWith("AI provider error") || message.includes("empty response")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The AI service is unavailable right now. Your exam details are saved — please try again in a bit.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: "Something went wrong while generating your plan. Your exam details are saved; try again.",
      },
      { status: 500 }
    );
  }
}
