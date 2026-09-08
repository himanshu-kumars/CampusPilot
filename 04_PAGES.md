# CampusPilot — Page & Screen Specification

## 1. Global Navigation

Desktop:
```text
CampusPilot
-------------------------------------------
Dashboard | Attendance | Assignments | Exams | Study Planner
```

Mobile:
- Compact top bar.
- Hamburger/bottom navigation.
- Primary CTA remains visible.

## 2. Landing Page

### Goal
Explain the product within a few seconds.

### Sections

#### Hero
Headline:
**Your college life, under control.**

Subheadline:
**Track attendance, deadlines, exams, and let AI build a study plan around your real schedule.**

CTA:
**Get Started**

Secondary CTA:
**See how it works**

#### Problem
"Your academic life is scattered."

Show cards:
- Attendance
- Assignments
- Exams
- Study planning

#### Solution
Present CampusPilot as one unified workspace.

#### AI feature
Show an example Emergency Study Mode transformation.

#### Final CTA
**Start planning smarter**

## 3. Login Page

Elements:
- Email.
- Password.
- Login button.
- Sign-up link.
- Error message area.

## 4. Sign-up Page

Fields:
- Full name.
- Email.
- Password.
- College.
- Semester.

CTA:
**Create account**

## 5. Dashboard

### Header
"Good morning, {name} 👋"

### Stat cards
- Overall attendance.
- Assignments due.
- Next exam.
- Study progress.

### Priority panel
"Today's priorities"

### Attendance alert
Example:
"Digital Electronics is at 68%. Attendance needs attention."

### AI recommendation
Example:
"Your Mathematics exam is in 5 days. Start Unit 2 today."

CTA:
**Generate study plan**

### Recent assignments
Show 3–5 upcoming assignments.

## 6. Attendance Page

### Header
"Attendance"

CTA:
**Add subject**

### Subject card
```text
Digital Electronics
68%
Attended: 17 / 25
Target: 75%

Need approximately 7 consecutive attended classes
to reach the target.
```

Include visual progress bar and status label.

### Add/edit subject modal
- Subject.
- Attended.
- Total.
- Target.

## 7. Assignments Page

### Header
"Assignments"

CTA:
**Add assignment**

Filters:
- All
- Pending
- In Progress
- Completed

Assignment card:
```text
Mathematics Assignment
Due in 2 days
Priority: High
[Mark complete]
```

Add/edit fields:
- Title.
- Subject.
- Deadline.
- Priority.
- Notes.

## 8. Exams Page

### Header
"Exam Planner"

CTA:
**Add exam**

Exam card:
```text
Mathematics-I
5 days remaining
Preparation: 30%

[Open Study Planner]
```

Add/edit fields:
- Subject.
- Date.
- Preparation %.
- Syllabus/topics.

## 9. Study Planner Page

### Header
"AI Study Planner"

### Input section
- Select exam.
- Days remaining.
- Available study hours/day.
- Preparation %.
- Syllabus/topics.
- Weak topics.

CTA:
**Generate Plan**

### Loading state
"Building a realistic plan around your time..."

### Result
Day-by-day cards:
```text
DAY 1
Learn: Unit 1
Practice: 20 questions
Revision: 30 min
```

Each task has:
- Duration.
- Type.
- Completion checkbox.

## 10. Emergency Study Mode

Prominent callout:

```text
⚡ Emergency Study Mode

Exam is close? We'll prioritize what matters most.

[ Activate ]
```

Inputs:
- Days remaining.
- Study hours/day.
- Current preparation.
- Topics.

Output:
- Survival priority list.
- Daily schedule.
- Final revision.
- Mock-test recommendation.

## 11. Settings

MVP:
- Profile.
- Attendance target.
- Theme preference if easy.
- Logout.

## 12. Empty States

Attendance:
"No subjects yet. Add your first subject to start tracking."

Assignments:
"Nothing due. Your task list is clear."

Exams:
"No upcoming exams. Add one to activate AI planning."

Study Planner:
"Choose an exam to build your plan."

## 13. Responsive Rules

At mobile widths:
- Stat cards stack.
- Tables become cards.
- Modals become full-screen sheets.
- Primary actions become full-width.
- Navigation collapses.

## 14. Demo Route

The shortest demo path:

```text
Login
  ↓
Dashboard
  ↓
Attendance alert
  ↓
Open Mathematics exam
  ↓
Generate AI plan
  ↓
Show Emergency Mode
```

