# CampusPilot — Test Plan

## Unit tests

### Attendance
Test:
- 0/0
- 0/10
- 5/10
- 75/100
- 74/100
- attended = total
- attended > total
- negative input

### Date logic
Test:
- exam today
- exam tomorrow
- exam in five days
- past exam
- timezone boundaries

### AI validation
Test:
- valid JSON
- missing fields
- wrong enum
- invalid duration
- malformed response

## Integration tests

### Auth
1. Sign up.
2. Login.
3. Open protected route.
4. Logout.
5. Confirm redirect.

### Database
- create/update/delete subject
- create/update/delete assignment
- create/update/delete exam
- create study plan

### RLS
User A must not see User B's:
- subjects
- assignments
- exams
- study plans

## End-to-end demo test

1. Login.
2. Add subject with 17/25.
3. Confirm 68% attendance.
4. Add an assignment.
5. Add Mathematics exam five days away.
6. Generate study plan.
7. Confirm daily plan renders.
8. Mark one task completed.

## Regression

Before every submission:
- run build
- run tests
- manually complete the demo script
- check mobile width
