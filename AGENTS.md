# AI Agent Instructions for Marketing App

## Purpose
This repository is a Next.js app built with React, Tailwind CSS, and Supabase. The app uses the Next.js App Router and mixes server and client components in `app/`, with a client-heavy UI under `components/`.

## Important conventions
- Run the app locally with `npm install` followed by `npm run dev`.
- The codebase relies on `process.env.NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- The Supabase client is created in `lib/supabase.js` for browser code and `lib/supabaseServer.js` for server-side code.
- Authentication and session handling are implemented through `app/api/auth/*` routes and `lib/authSession.js`.
- `app/page.js` redirects users to `/dashboard` or `/auth` based on session state.
- Many files in `app/` are client components, especially pages under `app/*` and UI components under `components/`.

## Recommended workflow for AI coding agents
- Use `npm run dev` to test local changes.
- Use `npm run build` to validate production compilation and route compatibility.
- Use `npm run lint` to check syntax and style.
- Preserve existing Supabase schema order and environment setup from `README.md`.

## Key files and directories
- `app/` - Next.js App Router pages and route handlers
- `components/` - reusable UI components and layout shells
- `lib/` - shared utilities, Supabase clients, auth/session helpers
- `supabase/` - SQL schema files for Supabase tables
- `README.md` - setup and deployment guidance

## Notes for contributions
- Do not commit `.env.local` or secrets.
- Refer to `README.md` for environment setup and database initialization.
- Avoid changing global browser-only state from server components.

## Useful links
- [README.md](./README.md)
- [`package.json`](./package.json)
- [`supabase/`](./supabase/)