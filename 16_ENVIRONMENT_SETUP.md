# CampusPilot — Environment Setup

## Prerequisites

Recommended:
- Node.js LTS
- npm
- Git
- GitHub account
- Supabase project
- AI provider account
- Vercel account

## Local project

```bash
npx create-next-app@latest campuspilot
cd campuspilot
npm install @supabase/ssr @supabase/supabase-js zod
```

Add your selected UI library only after the core setup is stable.

## Environment file

Create:

`.env.local`

Use `30_ENV_EXAMPLE.txt` as the template.

## Supabase

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `07_DATABASE_SCHEMA.sql`.
4. Optionally run `31_SUPABASE_TRIGGER.sql`.
5. Configure Authentication.
6. Add local environment values.

## AI

Choose one provider:
- Gemini
- OpenAI

Store the key server-side only.

## Development

```bash
npm run dev
```

Open the local development URL shown by Next.js.

## Build

```bash
npm run build
npm run start
```

The production build must complete before deployment.

## Setup verification

- [ ] Auth works.
- [ ] Database writes work.
- [ ] RLS blocks another user's data.
- [ ] AI generation works.
- [ ] No secrets appear in browser code.
