# CampusPilot — UI State & Error Specification

Every data-driven view must handle five states:

## 1. Loading

Show a skeleton matching the final layout.

Examples:
- Dashboard cards shimmer.
- Assignment rows show placeholders.
- Study planner shows generation progress.

## 2. Empty

Use friendly action-oriented text.

Example:
"No exams yet. Add your first exam to build an AI study plan."

Primary action:
"Add exam"

## 3. Success

After mutations:
- show concise toast
- update local/server data
- keep the user in context

Example:
"Assignment marked complete."

## 4. Error

Errors should say:
- what failed
- what the user can do

Bad:
"Error 500"

Good:
"Could not save the assignment. Check your connection and try again."

## 5. Unauthorized

Unauthenticated users:
- redirect to login
- preserve safe return path where appropriate

## AI-specific states

### Generating
"Building a realistic plan around your available time..."

### AI failure
"Your plan could not be generated right now. Your exam details are saved; try again."

Never erase user input after AI failure.

## Form validation

Inline validation:
- required fields
- numeric bounds
- invalid dates
- attended > total
- preparation outside 0–100

## Destructive actions

Delete operations require confirmation where accidental deletion could matter.
