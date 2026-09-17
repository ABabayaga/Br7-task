# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

BR7 Tasks — an internal project-management tool for BR7 (marketing agency,
Grupo Upper) with a Gantt chart for planning/tracking tasks. This directory
is the frontend of a monorepo (`../backend` is a NestJS + Mongoose API,
`../docs/superpowers/` has the original spec/plan docs for both sides).

Spec/plan docs (`../docs/superpowers/specs/`), read the relevant one before
non-trivial changes in its area — they document decisions that aren't
obvious from the code:
- `2026-09-11-gantt-tasks-design.md` — auth, core data model, Gantt
  drag/resize/dependency flows (e.g. why dependencies are edited via a
  multi-select instead of drawn on the canvas).
- `2026-09-15-service-templates-design.md` — service types and stage
  templates (the per-service-type checklist of stages used to generate a
  project's tasks).
- `2026-09-17-template-phases-design.md` — phases (named groupings of stage
  templates within a service type, with per-group reordering).

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
  exports `TOKEN_KEY`). `AuthContext` (`src/auth/AuthContext.tsx`) decodes the
  token client-side (`src/auth/jwt.ts`) to derive `role` (`'admin' | 'member'`,
  see `Role` in `src/types.ts`) and wraps login/logout, exposing `useAuth()`.
  The axios instance (`src/api/client.ts`) injects `Authorization: Bearer
  <token>` on every request and, on a 401 response, clears the token and
  hard-redirects to `/login` — auth failures are handled centrally there, not
  per-call. `ProtectedRoute` (`src/auth/ProtectedRoute.tsx`) gates the
  authenticated routes; `AppLayout.tsx` additionally hides admin-only nav
  items (Usuários, Template Serviços, Clientes) based on `role`, so any new
  admin-only page needs the same `role === 'admin'` check both in the nav and
  wherever the page itself renders.
- **API layer**: one file per resource under `src/api/` (`auth.ts`,
  `clients.ts`, `phases.ts`, `projects.ts`, `serviceTypes.ts`,
  `stageTemplates.ts`, `tasks.ts`, `users.ts`), each a thin set of functions
  wrapping `apiClient` and returning typed data (types from `src/types.ts`,
  which mirrors the backend Mongoose schemas). Add new endpoints here rather
  than calling axios directly from components.
- **Routing**: all routes are declared in `App.tsx`. `/login` is public;
  everything else sits behind `ProtectedRoute` + `AppLayout` (sidebar nav):
  `/` (home), `/projetos` (projects dashboard), `/projects/:id` (Gantt view),
  `/usuarios`, `/tipos-servico` (service types) and
  `/tipos-servico/:serviceTypeId/etapas` (that type's stage templates,
  grouped by phase), `/clientes` and `/clientes/:clientId` (per-client
  overrides of stage templates/durations).
- **Service types, phases & stage templates**: a `ServiceType`
  (`ServiceTypesPage.tsx`) owns an ordered list of `StageTemplate`s
  (`StageTemplatesPage.tsx`), each with a default sector/duration and an
  optional `Phase` grouping (colored, orderable groups — see
  `PhaseModal.tsx`). Creating a project from a service type generates its
  tasks from these templates; `ClientOverridesPage.tsx` lets a client
  override individual template values without touching the shared template.
- **Gantt view** (`src/pages/ProjectGanttPage.tsx`): renders
  `src/gantt/TaskChecklistGantt.tsx`, a home-grown checklist-style table (no
  external Gantt library) — stats/progress header, status filter pills, and
  one row per task with a checkbox (toggles `todo`↔`done` via `PATCH
  /tasks/:id`) plus a dot per week column showing when the task is active.
  Week columns are computed from the tasks' own date range by
  `src/gantt/computeWeekColumns.ts` (no fixed calendar). Clicking anywhere
  else on a row opens `TaskEditModal.tsx` for full editing (name, assignee,
  status, dependencies). Dependencies are not drawn visually — they're only
  set via the multi-select in `TaskEditModal.tsx`.
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
