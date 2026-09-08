# CampusPilot — Product Requirements Document (PRD)

## 1. Product Overview

**Product name:** CampusPilot  
**Tagline:** *Your college life, under control.*

CampusPilot is an AI-powered student success platform that brings attendance, assignments, exams, tasks, and personalized study planning into one focused dashboard.

The product is designed for college students who currently manage academic information across notebooks, WhatsApp groups, PDFs, calendars, and college portals.

## 2. Problem Statement

Students commonly face five connected problems:

1. They do not know their real-time attendance status or how many classes they can safely miss.
2. Assignment deadlines are scattered across messages, notices, and portals.
3. Exam preparation starts too late because students lack a realistic plan.
4. Study plans are generic and ignore available time, syllabus progress, and weak areas.
5. Students lack a single view of what requires attention today.

## 3. Target Users

### Primary user
College/university students, especially undergraduate students.

### Secondary users
Students preparing for internal tests, semester exams, vivas, and assignment-heavy courses.

## 4. Product Vision

Build a personal academic command center that answers three questions immediately:

- **What needs my attention?**
- **How much time do I have?**
- **What should I study next?**

## 5. Goals

### MVP goals
- Provide a clean student dashboard.
- Track attendance by subject.
- Track assignments and deadlines.
- Track upcoming exams.
- Generate personalized AI study plans.
- Include an emergency study mode for short preparation windows.
- Provide simple progress and priority indicators.

### Non-goals for the 24-hour MVP
- Full college ERP integration.
- Automatic attendance import from university systems.
- Native mobile applications.
- Real-money features or payments.
- Large-scale social/community features.
- Complex teacher/admin portals.

## 6. Core Features

### A. Authentication
- Email/password sign up and login.
- User profile with name, college, semester, and optional course details.
- Secure session management through Supabase Auth.

### B. Student Dashboard
The dashboard displays:
- Overall attendance.
- Assignments due soon.
- Next exam.
- Today's tasks.
- Study progress.
- AI recommendation card.

The dashboard should answer the user's priorities within five seconds.

### C. Attendance Tracker
Users can create subjects and record:
- Subject name.
- Classes attended.
- Total classes.

CampusPilot calculates:

`Attendance % = (Attended Classes / Total Classes) × 100`

The system should also estimate the number of consecutive classes required to reach a target percentage.

Default target: **75%**, configurable later.

States:
- Healthy
- Watch
- Critical

### D. Assignment Manager
Each assignment stores:
- Title.
- Subject.
- Deadline.
- Priority.
- Status.
- Optional notes.

Statuses:
- Pending
- In Progress
- Completed

Sorting:
- Deadline first.
- High priority first.
- Overdue items first.

### E. Exam Planner
Each exam stores:
- Subject.
- Exam date.
- Preparation percentage.
- Optional syllabus/topics.

The app calculates remaining days and highlights urgent exams.

### F. AI Study Planner
The AI receives:
- Exam subject.
- Exam date.
- Days remaining.
- Available study hours per day.
- Syllabus/topics.
- Current preparation percentage.
- Optional weak topics.
- Existing assignment workload.

The AI returns:
- Daily schedule.
- Topic priorities.
- Revision blocks.
- Practice-question blocks.
- Mock-test recommendation.
- Final revision plan.

### G. Emergency Study Mode
When the exam is close, the user can activate Emergency Mode.

Example input:
- Exam: Mathematics-I
- Days remaining: 3
- Preparation: 25%
- Available time: 4 hours/day

The AI prioritizes high-value topics, revision, practice, and mock testing.

## 7. User Journey

1. Student lands on CampusPilot.
2. Student creates an account.
3. Student adds subjects.
4. Student records current attendance.
5. Student adds assignments and exams.
6. Dashboard summarizes the situation.
7. Student selects an exam.
8. Student clicks **Generate Study Plan**.
9. AI creates a personalized plan.
10. Student marks tasks complete.
11. Dashboard updates progress.

## 8. Functional Requirements

### FR-01 Authentication
The system shall allow users to register, log in, log out, and maintain authenticated sessions.

### FR-02 Subject Management
The system shall allow authenticated users to create, edit, and delete their own subjects.

### FR-03 Attendance
The system shall calculate attendance percentage from attended and total class counts.

### FR-04 Attendance Risk
The system shall visually flag subjects below the configured attendance threshold.

### FR-05 Assignment CRUD
Users shall be able to create, edit, complete, and delete assignments.

### FR-06 Exam CRUD
Users shall be able to create, edit, and delete exams.

### FR-07 AI Plan Generation
The system shall generate a plan from exam and study constraints.

### FR-08 Persistence
User data shall persist in Supabase.

### FR-09 Responsive UI
The core experience shall work on desktop and mobile widths.

### FR-10 Error Handling
The app shall show understandable messages for failed login, failed database operations, and AI errors.

## 9. Non-Functional Requirements

- Fast first dashboard load.
- Accessible contrast and readable typography.
- No sensitive data exposed to other users.
- Server-side secrets must not be placed in client code.
- Clear loading states for AI generation.
- Graceful empty states.
- Consistent component design.

## 10. Success Metrics for the Hackathon Demo

The MVP should demonstrate:
- A complete login-to-dashboard journey.
- At least one live attendance calculation.
- At least one assignment workflow.
- At least one exam workflow.
- One successful AI study-plan generation.
- A clear before/after story showing how the AI reduces planning effort.

## 11. Demo Scenario

**Persona:** A first-year college student.

Situation:
- Attendance is 68% in Digital Electronics.
- Three assignments are due this week.
- Mathematics exam is in five days.
- Student has completed only 30% of the syllabus.

CampusPilot:
1. Flags attendance risk.
2. Shows assignment priorities.
3. Identifies the Mathematics exam as urgent.
4. Generates an achievable five-day study plan.
5. Lets the student track completion.

## 12. AI Output Rules

AI plans should:
- Be realistic rather than overloaded.
- Allocate the user's available hours rather than inventing extra time.
- Prioritize imminent exams and weak/high-value topics.
- Include breaks when study windows are long.
- Include practice and revision, not only reading.
- Never claim guaranteed grades.
- Clearly state that the plan is a planning aid.

## 13. Future Roadmap

### Phase 2
- PDF/notes ingestion.
- AI notes summarizer.
- Question generator.
- Viva practice mode.
- Calendar integration.
- Reminder notifications.

### Phase 3
- University timetable import.
- Teacher/mentor features.
- Advanced analytics.
- Peer study groups.
- Mobile application.
- Personalized learning analytics.

## 14. MVP Definition of Done

The MVP is complete when a new user can:
1. Sign up.
2. Reach the dashboard.
3. Add a subject and attendance numbers.
4. See attendance percentage.
5. Add an assignment.
6. Add an exam.
7. Generate an AI study plan.
8. View the plan clearly.
9. Deploy the app.

