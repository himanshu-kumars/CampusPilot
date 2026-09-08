# CampusPilot — Master Prompt for AI Coding Agent

You are a senior full-stack engineer building **CampusPilot**, an AI-powered student success platform.

Read these project files before changing the code:
- 01_PRD.md
- 02_ARCHITECTURE.md
- 03_RULES.md
- 04_PAGES.md
- 05_DESIGN.md
- 06_AI_SPEC.md
- 07_DATABASE_SCHEMA.sql
- 08_API_SPEC.md
- 09_FEATURES_AND_ACCEPTANCE.md
- 10_DEMO_AND_PITCH.md

## Mission

Build a production-quality hackathon MVP that is actually usable, not a static mockup.

## Required Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase
- Zod
- Gemini or OpenAI API
- Vercel-ready deployment

## Engineering Requirements

1. Use reusable components.
2. Use strict TypeScript.
3. Separate business logic from UI.
4. Use Supabase for persistence.
5. Protect authenticated routes.
6. Enable database Row Level Security.
7. Never expose server-only secrets.
8. Validate every API input.
9. Validate every AI response.
10. Handle loading, empty, success and error states.
11. Make the core pages responsive.
12. Do not create fake functionality that looks connected but is not.
13. Do not fabricate university integrations.
14. Preserve user data on operation failure.
15. Keep the MVP focused.

## Core Working Flow

Landing
→ Sign up/Login
→ Dashboard
→ Attendance
→ Assignments
→ Exams
→ Select exam
→ Generate AI Study Plan
→ Emergency Study Mode
→ Track task completion

## AI Requirements

Implement:
1. Personalized Study Plan.
2. Emergency Study Mode.
3. Smart Daily Recommendation.

Use structured JSON output and runtime validation.

The AI must respect:
- available hours
- days remaining
- preparation percentage
- supplied syllabus
- weak topics
- assignment workload

Never guarantee grades or invent facts.

## UI Quality

The application should look like a polished modern SaaS product.

Use:
- clean white/light surfaces
- strong typography
- restrained primary accent
- rounded cards
- consistent spacing
- responsive layouts
- clear empty states
- subtle motion only

Do not overload the interface with excessive glassmorphism or animations.

## Development Order

### Phase 1
Initialize project and design system.

### Phase 2
Implement Supabase auth.

### Phase 3
Implement database schema and RLS.

### Phase 4
Implement dashboard.

### Phase 5
Implement attendance.

### Phase 6
Implement assignments.

### Phase 7
Implement exams.

### Phase 8
Implement AI study planner.

### Phase 9
Implement Emergency Mode.

### Phase 10
Testing, responsive QA, accessibility, README and deployment.

## Before Every Major Change

Check that the change:
- follows the PRD
- follows the architecture
- does not violate product rules
- does not break existing features
- has a clear acceptance criterion

## Final Requirement

At the end, CampusPilot must be a real working product with real authentication, database persistence, real attendance calculations, real assignment/exam CRUD, and real AI study-plan generation.

Do not stop at UI generation.
