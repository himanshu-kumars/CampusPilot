# CampusPilot — AI Specification

## 1. Purpose

The AI layer must generate useful, structured, realistic academic plans from the student's actual constraints.

The AI is not a generic chatbot. It is a planning engine.

## 2. AI Features

### Feature A — Personalized Study Plan
Inputs:
- exam subject
- exam date
- preparation percentage
- available study hours/day
- syllabus/topics
- weak topics
- assignment workload

Output:
- summary
- daily plan
- time blocks
- learning/practice/revision split
- final revision
- priority topics

### Feature B — Emergency Study Mode
Used when an exam is close.

The AI must:
1. Calculate urgency.
2. Prioritize essential topics.
3. Protect revision time.
4. Include practice.
5. Avoid unrealistic schedules.

### Feature C — Smart Daily Recommendation
The AI can summarize:
- most urgent academic item
- attendance risk
- nearest deadline
- recommended next study task

## 3. System Prompt

Use a server-side system prompt similar to:

```text
You are CampusPilot's Academic Planning Engine.

Your job is to create realistic study plans from the exact information provided by the student.

Rules:
1. Never invent syllabus topics when none are provided.
2. Respect the student's available study hours.
3. Prioritize deadlines and exam urgency.
4. Separate learning, practice, and revision.
5. Include breaks when study blocks are long.
6. Prefer achievable plans over overloaded plans.
7. Never guarantee grades or academic outcomes.
8. Never claim to know official university policies.
9. Use only the supplied facts and clearly label assumptions.
10. Return valid JSON matching the requested schema exactly.
```

## 4. JSON Schema

```json
{
  "summary": "string",
  "urgency": "low|medium|high|critical",
  "total_hours": 0,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "focus": "string",
      "tasks": [
        {
          "title": "string",
          "duration_minutes": 60,
          "type": "learn|practice|revision|mock|break",
          "priority": "high|medium|low"
        }
      ]
    }
  ],
  "final_revision": ["string"],
  "tips": ["string"]
}
```

## 5. Input Contract

```json
{
  "exam": {
    "subject": "Mathematics-I",
    "date": "2026-09-13",
    "preparation_percent": 30
  },
  "available_hours_per_day": 4,
  "syllabus": [
    "Unit 1",
    "Unit 2",
    "Unit 3"
  ],
  "weak_topics": [
    "Integration"
  ],
  "assignments": [
    {
      "title": "Math assignment",
      "deadline": "2026-09-10"
    }
  ]
}
```

## 6. Reliability

Validate AI output before rendering.

If validation fails:
1. Retry once with a repair prompt.
2. If still invalid, show a friendly error.
3. Never render malformed AI data.

## 7. Cost Control

- Generate only when the user requests a plan.
- Do not call AI on every page load.
- Cache a generated plan until the user changes important inputs.
- Prefer structured output to reduce parsing failures.

## 8. AI UX

Before generation:
"Tell us your exam date, preparation level and available time."

During generation:
"Building a plan around your actual schedule..."

After generation:
"Plan generated from your exam date, preparation level and available study time."

## 9. Safety

The AI is a planning assistant only. It must not make medical, legal, financial, or institutional policy claims.
