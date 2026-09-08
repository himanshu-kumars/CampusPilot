# CampusPilot — Component Specification

## Layout

### AppShell
Responsibilities:
- authenticated navigation
- responsive sidebar/mobile navigation
- page container
- global feedback region

### PageHeader
Props:
- title
- subtitle
- primaryAction

## Dashboard components

### StatCard
Props:
- label
- value
- helper text
- status
- icon

### PriorityList
Displays urgent assignments, exam and attendance warnings.

### AIInsightCard
Shows one recommendation and primary CTA.

### UpcomingExamCard
Shows subject, date, preparation and urgency.

## Attendance components

### AttendanceCard
Displays:
- subject
- percentage
- attended/total
- target
- status
- recovery estimate
- edit/delete

### AttendanceProgress
Must include text label and percentage, not color alone.

### SubjectForm
Fields:
- subject
- attended
- total
- target

## Assignment components

### AssignmentCard
Displays:
- title
- subject
- deadline
- priority
- status
- completion action

### AssignmentForm
Fields:
- title
- subject
- deadline
- priority
- notes

## Exam components

### ExamCard
Displays:
- subject
- date
- days remaining
- preparation
- planning CTA

### ExamForm
Fields:
- subject
- date
- preparation
- syllabus
- weak topics

## AI components

### StudyPlannerForm
Inputs:
- exam
- hours/day
- preparation
- syllabus
- weak topics

### StudyPlanTimeline
Displays daily groups.

### StudyTask
Props:
- title
- duration
- type
- priority
- completed

### EmergencyModeCard
Prominent but not distracting.

## Shared components

- Button
- Input
- Select
- Textarea
- Checkbox
- Badge
- Modal/Sheet
- Toast
- Skeleton
- EmptyState
- ErrorState
- ConfirmDialog

## Component rule

Do not duplicate nearly identical cards for attendance, assignment and exam pages. Prefer composable primitives.
