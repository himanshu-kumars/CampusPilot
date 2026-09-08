# CampusPilot — User Stories & Acceptance Scenarios

## Epic 1 — Onboarding

### US-01 Sign up
As a student, I want to create an account so my academic data can be stored.

**Acceptance**
- Valid email/password creates an account.
- Invalid data shows an actionable message.
- Successful sign-up creates/loads the profile flow.

### US-02 Login
As a student, I want to log in securely so I can access my dashboard.

**Acceptance**
- Valid credentials open the dashboard.
- Invalid credentials show an error.
- Protected pages are inaccessible without authentication.

## Epic 2 — Attendance

### US-03 Add subject
As a student, I want to add a subject with attended and total classes.

### US-04 See attendance risk
As a student, I want to immediately know which subject needs attention.

### US-05 Calculate recovery
As a student, I want an estimate of consecutive classes needed to reach my attendance target.

## Epic 3 — Assignments

### US-06 Add assignment
As a student, I want to record an assignment and deadline.

### US-07 Prioritize assignments
As a student, I want urgent assignments to appear first.

### US-08 Complete assignment
As a student, I want to mark an assignment complete and see it leave my urgent list.

## Epic 4 — Exams

### US-09 Add exam
As a student, I want to record an upcoming exam.

### US-10 Track readiness
As a student, I want to record my preparation percentage.

## Epic 5 — AI Planning

### US-11 Generate plan
As a student, I want AI to create a plan using my exam date, preparation, topics and available time.

### US-12 Emergency mode
As a student with very little time, I want an emergency plan that prioritizes the most important work.

### US-13 Track plan
As a student, I want to mark generated tasks complete.

## Key user scenario

A student with:
- 68% attendance in one subject
- three assignments
- a Mathematics exam in five days
- 30% preparation
- four study hours/day

should be able to enter the app, understand the problem immediately, generate a five-day plan, and begin a task in under five minutes.
