# CampusPilot — GitHub Workflow

## Branches

```text
main
dev
feature/dashboard
feature/attendance
feature/assignments
feature/exams
feature/ai-planner
```

## Commit convention

```text
feat: add attendance tracker
feat: add AI study planner
fix: prevent invalid attendance input
refactor: split dashboard cards
docs: update deployment guide
```

## Pull request checklist

- What changed?
- Why?
- Which acceptance criteria are covered?
- Is the build passing?
- Were secrets introduced?
- Is the demo flow still working?

## Before final submission

```bash
git status
npm run build
```

Then manually test the full demo.

## AI coding agent rule

Never allow an AI coding agent to rewrite the entire project without preserving working features. Prefer small, testable tasks.
