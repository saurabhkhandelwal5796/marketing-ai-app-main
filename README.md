## Marketing AI App

This is a Next.js app for creating and managing AI-assisted marketing campaigns with Supabase-backed persistence.

## Team Setup (Shared Supabase)

Use one shared Supabase project per environment (for example, one for `dev`, one for `prod`) so all teammates see the same data.

### 1) Configure environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
cp .env.example .env.local
```

Required keys:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Notes:

- `.env.local` is ignored by git and must not be committed.
- Share secrets through a secure channel (password manager or vault).

### 2) Create/upgrade database schema

Run these SQL files in Supabase SQL Editor (in this order):

1. `supabase/campaigns.sql`
2. `supabase/campaign_logs.sql`

### 3) Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the app and pages as needed. The page auto-updates as you edit files.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy

The easiest way to deploy is with [Vercel Platform](https://vercel.com/new).

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
