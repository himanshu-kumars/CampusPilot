# CampusPilot — Feature Acceptance Checklist

## P0 — Must Work

### Authentication
- [ ] User can sign up.
- [ ] User can log in.
- [ ] User can log out.
- [ ] Protected pages redirect unauthenticated users.

### Dashboard
- [ ] Dashboard loads real user data.
- [ ] Attendance summary is correct.
- [ ] Assignment count is correct.
- [ ] Next exam date is correct.
- [ ] Empty states work.

### Attendance
- [ ] Add subject.
- [ ] Edit subject.
- [ ] Delete subject.
- [ ] Attendance percentage updates.
- [ ] Risk state updates.
- [ ] Classes-needed calculation works.
- [ ] Invalid attendance values are rejected.

### Assignments
- [ ] Create assignment.
- [ ] Edit assignment.
- [ ] Mark complete.
- [ ] Delete assignment.
- [ ] Sort by urgency.
- [ ] Overdue state works.

### Exams
- [ ] Create exam.
- [ ] Edit exam.
- [ ] Delete exam.
- [ ] Countdown/remaining days is correct.
- [ ] Preparation percentage works.

### AI Planner
- [ ] User can select an exam.
- [ ] User can enter available hours.
- [ ] AI plan generates.
- [ ] Output is structured.
- [ ] Plan respects available time.
- [ ] Plan includes revision.
- [ ] Invalid AI output does not crash the UI.

### Emergency Mode
- [ ] User can activate it.
- [ ] It clearly communicates urgency.
- [ ] It prioritizes limited time.
- [ ] It produces a usable plan.

## P1 — Should Work

- [ ] Responsive mobile layout.
- [ ] Loading skeletons.
- [ ] Toast feedback.
- [ ] Error states.
- [ ] Accessible form labels.
- [ ] Keyboard navigation.

## P2 — Nice to Have

- [ ] Dark mode.
- [ ] Calendar integration.
- [ ] PDF notes upload.
- [ ] AI question generation.
- [ ] Viva practice.

## Final QA

- [ ] Production build passes.
- [ ] No TypeScript errors.
- [ ] No exposed secrets.
- [ ] `.env.local` is ignored.
- [ ] Supabase RLS is enabled.
- [ ] Demo account/data works.
- [ ] README setup instructions are correct.
- [ ] GitHub repository is clean.
