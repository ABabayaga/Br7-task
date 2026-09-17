# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run start:dev       # dev server with watch mode
npm run build           # nest build
npm run lint            # oxlint src/ test/
npm run format          # prettier --write src/**/*.ts test/**/*.ts

npm run test            # unit tests (vitest, *.spec.ts, co-located with source)
npm run test:watch      # unit tests in watch mode
npm run test:e2e        # e2e tests (vitest, test/**/*.e2e-spec.ts)
npm run test:cov        # unit tests with coverage
```

Run a single test file: `npx vitest run src/tasks/dependency-cycle.util.spec.ts` (or `--config ./vitest.config.e2e.ts` for an e2e spec). Unit and e2e tests use separate vitest configs (`vitest.config.ts` vs `vitest.config.e2e.ts`) distinguished by filename pattern (`*.spec.ts` vs `*.e2e-spec.ts`), not by directory alone.

E2e tests spin up an in-memory MongoDB via `mongodb-memory-server` (see `test/test-db.helper.ts`'s `startTestDb()`), which also sets `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` env vars for the test run — no real database or `.env` needed to run tests.

## Architecture

NestJS + Mongoose (MongoDB) API, ESM throughout (`"type": "module"` in package.json) — **all relative imports must include the `.js` extension**, even though source files are `.ts` (e.g. `import { AppService } from './app.service.js'`).

Feature modules: `auth`, `users`, `projects`, `tasks`, `clients`, `phases`, `service-types`, `stage-templates`, each with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and (where applicable) `schemas/`. `AppModule` wires them together and configures `MongooseModule` from `MONGODB_URI` via `ConfigService`. `common/sector.ts` holds the single `SECTORS`/`Sector` enum shared across modules (no dedicated Nest module).

**Service-type template hierarchy** (drives project generation): a `ServiceType` (e.g. "Social Media") owns an ordered list of `StageTemplate`s (`stage-templates/schemas/stage-template.schema.ts`, unique `{serviceTypeId, order}` index) and optionally `Phase`s (`phases/schemas/phase.schema.ts`, unique `{serviceTypeId, order}` index) that group stages visually/temporally via `startDay`/`endDay` offsets — a `StageTemplate.phaseId` optionally links it into a phase. `Client`s can override the template per service type via `ClientServiceOverride` (`clients/schemas/client-service-override.schema.ts`), disabling specific stage templates for that client. `SeedServiceTemplatesService` (`service-types/seed-service-templates.service.ts`, registered as a bare `AppModule` provider like `SeedAdminService`) seeds hardcoded service types/stages on `OnApplicationBootstrap`.

**Project generation from templates**: `ProjectsService.create` (`projects/projects.service.ts`), when `dto.serviceTypeId` is set, loads that service type's active stage templates, filters out any the client has disabled, joins each to its `Phase`, and calls `TasksService.generateFromTemplate()` (`tasks/tasks.service.ts`). That method chains tasks linearly — each task's `startDate` is the previous task's `endDate` + 1 day, duration from `defaultDurationDays`, with `dependencies: [previousTaskId]` — there's no branching, so template generation doesn't need cycle detection (see below). If generation throws, `ProjectsService.create` deletes the just-created project doc to roll back.

**Reordering pattern**: `Phase`/`StageTemplate` reorder endpoints use a two-pass update (offset all orders out of the way, then apply final orders) to avoid unique-index collisions on `{serviceTypeId, order}` mid-update.

**Auth model**: JWT-based, guards registered globally as `APP_GUARD` providers in `AuthModule` (not applied per-controller):
- `JwtAuthGuard` runs first — rejects any request without a valid bearer token unless the handler/class is marked `@Public()` (see `auth/public.decorator.ts`). On success it attaches `request.user` (`{ sub, email, role }`, see `AuthenticatedUser` in `auth/jwt-auth.guard.ts`).
- `RolesGuard` runs after — enforces `@Roles('admin' | 'member')` (see `auth/roles.decorator.ts`) against `request.user.role`; routes with no `@Roles()` are open to any authenticated user.
- Because these are global guards, every new controller is auth-protected by default — use `@Public()` explicitly for unauthenticated endpoints (currently only `POST /auth/login`).

**Admin seeding**: `SeedAdminService` (`users/seed-admin.service.ts`) runs on `onApplicationBootstrap` and creates one admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars if no users exist yet.

**Task dependency graph**: `tasks/dependency-cycle.util.ts` exports `wouldCreateCycle()`, a pure DFS-based cycle check used by `TasksService.update()` to reject a `dependencies` update that would introduce a cycle in the project's task graph (only relevant to manual, user-edited dependencies — template-generated tasks are a linear chain, see above). Keep this logic framework-free (no Mongoose/Nest imports) so it stays unit-testable in isolation.

**Route shape**: several modules nest read/create under a parent for context but flatten mutation routes — `GET/POST /projects/:projectId/tasks` vs `PATCH/DELETE /tasks/:id` (`tasks/tasks.controller.ts`); `GET/POST /service-types/:serviceTypeId/phases` vs `PATCH/DELETE /phases/:id` (`phases/phases.controller.ts`); `GET/POST /service-types/:serviceTypeId/stage-templates` vs `PATCH/DELETE /stage-templates/:id` (`stage-templates/stage-templates.controller.ts`). `clients/:id/overrides/:serviceTypeId` (`clients/clients.controller.ts`) is the odd one out — nested `GET/PUT` with no flat equivalent, since an override is keyed by the client+serviceType pair rather than having its own id.

**Schemas** (`*/schemas/*.schema.ts`) use `@nestjs/mongoose` decorators with `{ timestamps: true }`; cross-document references use `Types.ObjectId` with a string `ref` (e.g. `Task.projectId` refs `Project`, `Task.dependencies` is an array of `Task` refs).

## Environment

Config is read via `ConfigService.getOrThrow()` (fails fast if missing) — required vars: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. See `.env.example`. `FRONTEND_ORIGIN` (default `http://localhost:5173`) configures CORS in `main.ts`.
