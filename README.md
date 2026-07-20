# NVRTRACK

NVRTRACK is a mobile-first, private fitness tracking web app focused on speed and simplicity.

## Current Scope (Sessions 1, 1.5, and 2)

The app currently includes:

- Session 1 foundation (Next.js App Router + TypeScript + Tailwind)
- Session 1.5 visual refinement pass (mobile-first dark premium UI)
- Session 2 authentication:
  - Supabase email/password signup and login
  - Cookie-based server-side session handling
  - Server-side route protection for app routes
  - Redirects between public auth routes and protected app routes
  - Logout from the Profile screen

## Technology

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Lucide React icons
- ESLint 9
- Supabase SSR (`@supabase/ssr`)
- Supabase JS (`@supabase/supabase-js`)

## Supabase Project Setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. In the Supabase dashboard, open **Project Settings → API**.
3. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **Project API key (anon/public key)** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Do **not** use a service-role key in this frontend app.

## Environment Variables

Copy `.env.example` to `.env.local` and set values:

```bash
cp .env.example .env.local
```

`.env.local` format:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Local Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Routes

### Public routes

- `/login`
- `/signup`
- `/auth/callback` (used by Supabase email confirmation flow)

### Protected routes

- `/`
- `/nutrition`
- `/training`
- `/progress`
- `/profile`

## Authentication Behavior

- Unauthenticated users trying to access protected routes are redirected to `/login`.
- Authenticated users visiting `/login` or `/signup` are redirected to `/`.
- Session cookies are refreshed server-side via Next.js `proxy.ts` + Supabase SSR.
- Refreshing the browser preserves login state when valid session cookies exist.
- Logout clears the Supabase session and redirects to `/login`.

## Signup Confirmation Behavior

- If your Supabase project requires email confirmation, signup shows a success state asking the user to check email.
- After clicking the confirmation link, Supabase returns through `/auth/callback`, which exchanges the code for a session and redirects to `/`.
- If email confirmation is disabled in your Supabase project, signup may sign the user in immediately.

## Manual Auth Test Checklist

After configuring `.env.local` and running `npm run dev`:

1. Visit `/` while logged out → confirm redirect to `/login`.
2. Create an account at `/signup`.
3. If confirmation is enabled, confirm the email via inbox.
4. Log in at `/login`.
5. Confirm access to all protected routes.
6. Refresh a protected page → confirm session persists.
7. Use **Log Out** on `/profile` → confirm redirect to `/login`.
8. Try opening `/login` while authenticated → confirm redirect to `/`.

## Static Data Notice

All fitness metrics and app content outside auth are still **static sample data** in this session.  
No fitness domain persistence tables (profiles, workouts, meals, weight entries, etc.) were added yet.
