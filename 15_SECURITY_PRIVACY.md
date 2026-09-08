# CampusPilot — Security & Privacy Requirements

## Authentication
- Supabase Auth for authentication.
- Server-side session validation for protected operations.
- Never store passwords directly in the application database.

## Authorization
Every user-owned record must be isolated by authenticated user ID.

Use Supabase RLS on:
- profiles
- subjects
- assignments
- exams
- study_plans

## Secrets
Never expose:
- AI API keys
- Supabase service-role key
- private tokens
- database passwords

Client-side variables must use only approved public prefixes.

## Input security
- Validate all API/server-action input.
- Do not dangerously render arbitrary HTML.
- Escape user-generated content where required.
- Apply basic abuse protection to AI endpoints.

## AI privacy
Only send the minimum information required to generate a study plan.

Do not send:
- passwords
- authentication tokens
- payment information
- unnecessary personal identifiers

## Data deletion
MVP should support account/data deletion planning even if the full self-service flow is deferred.

## Logging
Never log:
- passwords
- bearer tokens
- API keys
- raw auth cookies

## Demo security
Use fake/demo student information for public demonstrations.

## Compliance mindset
CampusPilot is an academic planning tool. It is not an official university ERP and must not imply institutional authority.
