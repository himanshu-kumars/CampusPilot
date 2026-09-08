# CampusPilot — Product & Engineering Rules

## 1. Product Principles

### Rule 1 — Student first
Every feature must reduce student effort or improve clarity.

### Rule 2 — One-screen clarity
The dashboard should make today's priorities obvious without requiring deep navigation.

### Rule 3 — AI assists; it does not pretend
The AI creates planning assistance. It must not claim guaranteed marks, guaranteed attendance outcomes, or official university decisions.

### Rule 4 — No fake automation
Do not show a feature as integrated with a university system unless a real integration exists.

### Rule 5 — MVP over feature count
For the 24-hour hackathon, a smaller polished product beats a large unfinished product.

## 2. Data Rules

- Users may access only their own data.
- Do not expose service keys.
- Validate user input.
- Sanitize or safely render user-generated text.
- Keep database constraints strict.
- Avoid storing unnecessary personal information.

## 3. Attendance Rules

- Attendance percentage must always be derived from attended and total classes.
- Prevent negative values.
- Prevent attended classes from exceeding total classes.
- Clearly distinguish estimated calculations from official university attendance.
- Default target is 75%, but keep it configurable.

## 4. Assignment Rules

Priority values:
- High
- Medium
- Low

Status values:
- Pending
- In Progress
- Completed

Overdue assignments must be visibly identifiable.

## 5. Exam Rules

- Exam date must be valid.
- Preparation percentage must stay between 0 and 100.
- Past exams should be marked as completed/past rather than treated as upcoming.
- Do not fabricate syllabus content.

## 6. AI Rules

The AI planner must:
- Respect the student's available hours.
- Avoid schedules that exceed available time.
- Include revision before an exam.
- Include practice where appropriate.
- Make the most urgent work visible.
- Return predictable structured data.
- Handle missing syllabus information honestly.

The AI planner must not:
- Guarantee grades.
- Present assumptions as facts.
- Claim official academic policy.
- Invent university rules.

## 7. UX Rules

- Every page must have a clear primary action.
- Keep forms short.
- Use readable labels.
- Show success and error feedback.
- Avoid excessive animations.
- Preserve user input when an operation fails.
- Design mobile-first, then optimize for desktop.

## 8. Accessibility Rules

- Use semantic HTML.
- Keyboard-accessible interactive elements.
- Visible focus states.
- Form labels must be associated with inputs.
- Do not rely on color alone to communicate state.
- Maintain sufficient contrast.

## 9. Code Rules

- TypeScript strict mode.
- Reusable components for repeated UI.
- Server secrets only on server.
- Validate API inputs with Zod.
- Keep business calculations in testable utility functions.
- Avoid giant components.
- Keep database logic separate from presentation logic.

## 10. Git Rules

Branch examples:

```text
main
dev
feature/dashboard
feature/attendance
feature/ai-study-plan
```

Commit examples:

```text
feat: add attendance calculation
feat: add exam planner
feat: connect study plan AI
fix: handle zero attendance total
docs: update setup guide
```

Before final submission:
- Remove debug logs.
- Remove test credentials.
- Confirm `.env` is not committed.
- Test production build.
- Update README.
- Verify demo flow.

## 11. Hackathon Rules for This Project

- Build the MVP inside the permitted hackathon window.
- Any pre-hackathon preparation should be limited to planning, design, architecture, setup knowledge, and other allowed preparation.
- Follow the organizer's official submission and originality requirements.
- Use only APIs/assets/code that are permitted by the event rules and their licenses.
- Clearly disclose major AI-assisted development where required by the organizers.

## 12. Definition of Done

A feature is done when:
1. It works.
2. It handles basic errors.
3. It has a usable UI.
4. It persists required data.
5. It does not expose secrets.
6. It is connected to the real demo flow.
