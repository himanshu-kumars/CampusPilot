# CampusPilot — Performance Requirements

## Targets for MVP

- Avoid unnecessary API calls.
- Keep dashboard initial data server-rendered where practical.
- Lazy-load non-critical AI interfaces when useful.
- Compress large assets.
- Avoid huge client bundles.

## Interaction targets

Common actions should feel immediate:
- navigation
- completing a task
- changing attendance
- opening a modal

AI generation may take longer and should show meaningful progress.

## Database

- Select only required columns.
- Index common user-owned queries if needed.
- Avoid fetching entire tables when a count or filtered result is sufficient.

## AI

- Do not call the AI on every dashboard load.
- Generate only on explicit user action.
- Validate and persist the plan when appropriate.
