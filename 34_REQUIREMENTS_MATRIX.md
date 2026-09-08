# CampusPilot — Requirements Traceability Matrix

| ID | Requirement | Document | Acceptance |
|---|---|---|---|
| AUTH-01 | Signup/login | 01, 12 | Auth workflow passes |
| DATA-01 | User data persistence | 02, 07 | CRUD persists |
| SEC-01 | User data isolation | 15 | RLS test passes |
| ATT-01 | Attendance calculation | 01, 32 | Formula tests pass |
| ATT-02 | Recovery estimate | 02, 32 | Consecutive-class estimate works |
| ASM-01 | Assignment CRUD | 01, 08, 09 | Create/edit/complete/delete |
| EXM-01 | Exam CRUD | 01, 08, 09 | Create/edit/delete |
| AI-01 | Study plan | 06, 29 | Valid structured plan |
| AI-02 | Emergency mode | 06, 10 | Constrained plan works |
| UI-01 | Responsive UI | 04, 05, 20 | Mobile smoke test passes |
| UX-01 | Loading/error/empty | 14 | All primary screens have states |
| PERF-01 | Avoid unnecessary AI calls | 21 | AI only on user action |
| DEP-01 | Production deployment | 17 | Production smoke test passes |
