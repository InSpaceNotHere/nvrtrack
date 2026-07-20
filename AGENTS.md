<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

NVRTRACK is a single Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 front end using npm. There is no backend, database, auth, or env vars (see `README.md`); all data is static in `src/lib/sample-data.ts`.

- Standard commands live in `package.json` scripts: `npm run dev` (dev server on port 3000), `npm run build`, `npm run start`, `npm run lint` (bare `eslint`).
- There is no test suite configured; `next build` performs type checking.
- Node 20+ is required for Next.js 16; the VM's default Node 22 works.
- End-to-end testing needs only the dev server: start `npm run dev` and exercise the five routes (`/`, `/nutrition`, `/training`, `/progress`, `/profile`). No login or external services are involved.
