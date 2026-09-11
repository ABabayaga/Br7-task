# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BR7 Tasks — an internal project-management tool for BR7 (marketing agency,
Grupo Upper) with a Gantt chart for planning/tracking tasks. This directory
is the frontend of a monorepo (`../backend` is a NestJS + Mongoose API,
`../docs/superpowers/` has the original spec/plan docs for both sides).

Full product/data-model spec:
`../docs/superpowers/specs/2026-09-11-gantt-tasks-design.md` — read it before
making non-trivial changes to auth, the data model, or the Gantt
drag/resize/dependency flows; it documents decisions (e.g. why dependencies
are edited via a multi-select instead of drawn on the canvas) that aren't
obvious from the code.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # tsc -b (type-check) then vite build
npm run lint      # oxlint
npm test          # vitest run (all tests, single pass)
```

Run a single test file: `npx vitest run src/pages/LoginPage.test.tsx`
Watch mode: `npx vitest`

Backend must be running separately (see `../backend`) for the app to work
against real data; `VITE_API_URL` in `.env` points at it (defaults to
`http://localhost:3000`).

## Architecture

- **Auth**: JWT stored in `localStorage` under `br7_token` (`src/api/client.ts`
  exports `TOKEN_KEY`). `AuthContext` (`src/auth/AuthContext.tsx`) wraps
  login/logout and exposes `useAuth()`. The axios instance
  (`src/api/client.ts`) injects `Authorization: Bearer <token>` on every
  request and, on a 401 response, clears the token and hard-redirects to
  `/login` — auth failures are handled centrally there, not per-call.
  `ProtectedRoute` gates the authenticated routes in `App.tsx`.
- **API layer**: one file per resource under `src/api/` (`auth.ts`,
  `projects.ts`, `tasks.ts`, `users.ts`), each a thin set of functions
  wrapping `apiClient` and returning typed data (types from `src/types.ts`,
  which mirrors the backend Mongoose schemas). Add new endpoints here rather
  than calling axios directly from components.
- **Routing**: three routes in `App.tsx` — `/login`, `/` (dashboard), and
  `/projects/:id` (Gantt view) — the latter two behind `ProtectedRoute`.
- **Gantt view** (`src/pages/ProjectGanttPage.tsx`): renders `gantt-task-react`.
  Tasks from the API are converted to the library's shape via
  `src/gantt/mapTasksToGanttFormat.ts`. Dragging/resizing bars issues
  optimistic `PATCH /tasks/:id` calls; on failure the UI should revert to
  last-confirmed server state (see spec's "Tratamento de erros" section).
  Dependencies are *not* drawn on the canvas (the library doesn't support
  it) — they're set via a multi-select in `TaskEditModal.tsx`, and the chart
  only renders the resulting arrows.
- **Imports**: relative imports use explicit `.js` extensions on `.ts`/`.tsx`
  files (TS `moduleResolution: bundler` + `allowImportingTsExtensions`) —
  follow this pattern for new files (`import { x } from './foo.js'` even
  though the file is `foo.ts`).
- **Styling**: Tailwind CSS (via `@tailwindcss/vite`), used directly —
  intentionally no design-system layer since this is an internal tool.

## Testing

Vitest + Testing Library + jsdom (`vite.config.ts` sets `environment: 'jsdom'`,
`setupFiles: src/setupTests.ts`). Tests live next to the file they cover
(`Foo.tsx` → `Foo.test.tsx`). Mock the API layer with `vi.spyOn(apiModule, 'fn')`
rather than mocking axios directly (see `LoginPage.test.tsx`,
`TaskEditModal.test.tsx`), and wrap components under test in
`MemoryRouter`/`AuthProvider` as needed.
