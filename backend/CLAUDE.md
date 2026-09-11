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

Feature modules: `auth`, `users`, `projects`, `tasks`, each with `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, and (where applicable) `schemas/`. `AppModule` wires them together and configures `MongooseModule` from `MONGODB_URI` via `ConfigService`.

**Auth model**: JWT-based, guards registered globally as `APP_GUARD` providers in `AuthModule` (not applied per-controller):
- `JwtAuthGuard` runs first — rejects any request without a valid bearer token unless the handler/class is marked `@Public()` (see `auth/public.decorator.ts`). On success it attaches `request.user` (`{ sub, email, role }`, see `AuthenticatedUser` in `auth/jwt-auth.guard.ts`).
- `RolesGuard` runs after — enforces `@Roles('admin' | 'member')` (see `auth/roles.decorator.ts`) against `request.user.role`; routes with no `@Roles()` are open to any authenticated user.
- Because these are global guards, every new controller is auth-protected by default — use `@Public()` explicitly for unauthenticated endpoints (currently only `POST /auth/login`).

**Admin seeding**: `SeedAdminService` (`users/seed-admin.service.ts`) runs on `onApplicationBootstrap` and creates one admin user from `ADMIN_EMAIL`/`ADMIN_PASSWORD` env vars if no users exist yet.

**Task dependency graph**: `tasks/dependency-cycle.util.ts` exports `wouldCreateCycle()`, a pure DFS-based cycle check used by `TasksService.update()` to reject a `dependencies` update that would introduce a cycle in the project's task graph. Keep this logic framework-free (no Mongoose/Nest imports) so it stays unit-testable in isolation.

**Route shape**: tasks are nested under projects for read/create (`GET/POST /projects/:projectId/tasks`) but flat for mutation (`PATCH/DELETE /tasks/:id`) — see `tasks/tasks.controller.ts`.

**Schemas** (`*/schemas/*.schema.ts`) use `@nestjs/mongoose` decorators with `{ timestamps: true }`; cross-document references use `Types.ObjectId` with a string `ref` (e.g. `Task.projectId` refs `Project`, `Task.dependencies` is an array of `Task` refs).

## Environment

Config is read via `ConfigService.getOrThrow()` (fails fast if missing) — required vars: `MONGODB_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. See `.env.example`. `FRONTEND_ORIGIN` (default `http://localhost:5173`) configures CORS in `main.ts`.
