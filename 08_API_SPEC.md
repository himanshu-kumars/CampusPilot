# CampusPilot — API Specification

## 1. Rules

All protected routes require an authenticated Supabase session.

All request bodies must be validated with Zod.

## 2. Study Plan

### POST `/api/study-plan`

Request:
```json
{
  "examId": "uuid",
  "availableHoursPerDay": 4,
  "preparationPercent": 30,
  "syllabus": ["Unit 1", "Unit 2"],
  "weakTopics": ["Integration"]
}
```

Response:
```json
{
  "success": true,
  "studyPlan": {
    "summary": "string",
    "urgency": "high",
    "total_hours": 12,
    "days": [],
    "final_revision": [],
    "tips": []
  }
}
```

Errors:
- `401` unauthenticated
- `400` invalid input
- `404` exam not found
- `422` AI response failed validation
- `500` unexpected server error

## 3. Dashboard Data

Prefer server-side database queries or server components for initial dashboard data instead of unnecessary API requests.

Dashboard requires:
- overall attendance
- urgent assignments
- next exam
- recent study plan/progress

## 4. CRUD

### Subjects
- `POST /api/subjects`
- `PATCH /api/subjects/:id`
- `DELETE /api/subjects/:id`

### Assignments
- `POST /api/assignments`
- `PATCH /api/assignments/:id`
- `DELETE /api/assignments/:id`

### Exams
- `POST /api/exams`
- `PATCH /api/exams/:id`
- `DELETE /api/exams/:id`

The implementation may use Server Actions instead of REST for simple CRUD.

## 5. Validation Rules

Subject:
- name required
- attended integer >= 0
- total integer >= 0
- attended <= total

Assignment:
- title required
- deadline required
- priority allowed values only
- status allowed values only

Exam:
- exam date required
- preparation 0–100

Study plan:
- available hours > 0
- preparation 0–100
- syllabus optional but must remain truthful

## 6. Rate Protection

AI endpoint should have basic abuse protection:
- authenticated users only
- request validation
- reasonable per-user generation limit
- server-side API key

## 7. Logging

Log:
- timestamp
- route
- success/failure
- non-sensitive error information

Never log:
- API keys
- passwords
- session tokens
