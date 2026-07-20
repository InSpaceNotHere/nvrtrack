# NVRTRACK

NVRTRACK is a mobile-first, private fitness tracking web app focused on speed and simplicity.

## Session 1 Scope

This repository currently contains **Session 1** only:

- Project foundation using Next.js App Router with TypeScript and Tailwind CSS
- Dark, minimalist design system aligned with the approved visual direction
- Reusable application shell with responsive navigation:
  - Mobile bottom navigation
  - Desktop sidebar navigation
- Static placeholder screens for:
  - `/` (Home)
  - `/nutrition`
  - `/training`
  - `/progress`
  - `/profile`
- Reusable UI and dashboard components for cards, metrics, progress bars, trends, and empty states

## Technology

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- Lucide React icons
- ESLint 9

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

## Current Routes

- `/` Home dashboard
- `/nutrition` Nutrition summary
- `/training` Training day overview
- `/progress` Progress tabs and static trends
- `/profile` Profile settings form

## Static Data Notice

All displayed calories, macros, weight, workout, PRs, and profile values are **static sample data** for UI prototyping in Session 1.  
No Supabase, authentication, or database integration is included yet.

## Session 2 Preview

Session 2 will introduce real data flow, persistence groundwork, and backend integration planning while keeping the same streamlined interface direction.
