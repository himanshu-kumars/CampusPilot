# CampusPilot — Technical Architecture

## 1. Architecture Summary

CampusPilot follows a lightweight full-stack web architecture:

```text
Browser
  |
  v
Next.js App Router
  |
  +---- UI Components / Client State
  |
  +---- Server Actions / API Routes
          |
          +---- Supabase Auth
          |
          +---- Supabase PostgreSQL
          |
          +---- AI Provider
```

## 2. Recommended Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Styling | Tailwind CSS |
| UI primitives | shadcn/ui or lightweight custom components |
| Backend | Next.js server actions / route handlers |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| AI | Gemini API or OpenAI API |
| Validation | Zod |
| Deployment | Vercel |
| Version control | GitHub |

## 3. Project Structure

```text
campuspilot/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── signup/
│   ├── dashboard/
│   ├── attendance/
│   ├── assignments/
│   ├── exams/
│   ├── study-planner/
│   ├── api/
│   │   └── study-plan/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── dashboard/
│   ├── attendance/
│   ├── assignments/
│   ├── exams/
│   ├── study/
│   └── ui/
├── lib/
│   ├── supabase/
│   ├── ai/
│   ├── calculations/
│   └── validation/
├── types/
├── supabase/
│   └── migrations/
├── public/
├── .env.example
└── README.md
```

## 4. Database Model

### profiles
```text
id UUID PK
full_name TEXT
college TEXT
semester TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### subjects
```text
id UUID PK
user_id UUID FK -> profiles.id
name TEXT
target_attendance INTEGER DEFAULT 75
created_at TIMESTAMP
updated_at TIMESTAMP
```

### attendance
```text
id UUID PK
subject_id UUID FK -> subjects.id
attended INTEGER DEFAULT 0
total INTEGER DEFAULT 0
updated_at TIMESTAMP
```

### assignments
```text
id UUID PK
user_id UUID FK -> profiles.id
subject_id UUID FK -> subjects.id
title TEXT
description TEXT
deadline TIMESTAMP
priority TEXT
status TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### exams
```text
id UUID PK
user_id UUID FK -> profiles.id
subject_id UUID FK -> subjects.id
exam_date TIMESTAMP
preparation_percent INTEGER DEFAULT 0
syllabus TEXT
created_at TIMESTAMP
updated_at TIMESTAMP
```

### study_plans
```text
id UUID PK
user_id UUID FK -> profiles.id
exam_id UUID FK -> exams.id
input_snapshot JSONB
plan JSONB
created_at TIMESTAMP
```

## 5. Relationships

```text
profiles
   |
   +----< subjects
   |        |
   |        +---- attendance
   |        |
   |        +----< assignments
   |        |
   |        +----< exams
   |                   |
   |                   +----< study_plans
   |
   +----< assignments
   +----< exams
   +----< study_plans
```

## 6. Security

Use Supabase Row Level Security.

Every user-owned table should enforce:

```text
auth.uid() = user_id
```

For child tables such as attendance, access should be restricted through the linked subject owned by the authenticated user.

Never expose:
- AI API keys.
- Supabase service-role key.
- Admin credentials.

Client-side environment variables should contain only keys intended for browser use.

## 7. Attendance Calculation

### Basic percentage

```text
percentage = attended / total * 100
```

Handle `total = 0` safely.

### Classes needed to reach target

For current attended `A`, total `T`, and target `P`:

Find the smallest non-negative integer `x` such that:

```text
(A + x) / (T + x) >= P
```

where `P` is represented as a decimal such as `0.75`.

If current attendance already meets target, show:
- "Target met"

If not, calculate the required consecutive attended classes.

## 8. AI Architecture

### Request flow

```text
User
  |
  v
Study Planner Form
  |
  v
Zod Validation
  |
  v
Next.js Server Route
  |
  v
AI Provider
  |
  v
Structured JSON
  |
  v
Validate AI output
  |
  v
Render Study Plan
```

### Suggested structured output

```json
{
  "summary": "string",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "focus": "string",
      "tasks": [
        {
          "title": "string",
          "duration_minutes": 60,
          "type": "learn"
        }
      ]
    }
  ],
  "final_revision": [
    "string"
  ]
}
```

## 9. AI Prompt Principles

System prompt should instruct the model to:
- Generate achievable plans.
- Respect available hours.
- Prioritize nearest deadlines.
- Avoid fabricating syllabus details.
- Separate learning, practice, revision, and testing.
- Return strict JSON matching the schema.
- Never give medical, legal, or academic-integrity claims.
- Avoid promising a particular grade.

## 10. API Routes

### `POST /api/study-plan`
Input:
```json
{
  "examId": "uuid",
  "daysRemaining": 5,
  "availableHoursPerDay": 4,
  "preparationPercent": 30,
  "syllabus": ["Unit 1", "Unit 2"]
}
```

Output:
```json
{
  "plan": {}
}
```

### Optional future routes
- `/api/ai/summarize`
- `/api/ai/questions`
- `/api/ai/viva`

## 11. Error Handling

AI errors:
- Show retry option.
- Preserve form data.
- Log server-side error details without exposing secrets.

Database errors:
- Show actionable UI messages.
- Never silently discard user input.

Loading:
- Use skeletons/spinners.
- Disable duplicate submissions.

## 12. Deployment

Recommended deployment:

```text
GitHub
   |
   v
Vercel
   |
   +---- Environment variables
   |
   +---- Supabase
   |
   +---- AI provider
```

Required production variables should be documented in `.env.example`.

## 13. Testing Priorities

### P0
- Login.
- Database writes.
- Attendance calculation.
- Assignment creation.
- Exam creation.
- AI generation.
- Mobile/desktop layout.

### P1
- Editing and deletion.
- Empty states.
- API validation.
- Authentication edge cases.

### P2
- Advanced analytics.
- Accessibility refinements.
- Performance optimization.

