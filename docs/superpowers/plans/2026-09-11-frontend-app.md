# BR7 Tasks — Frontend App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React + Vite + TypeScript frontend in `frontend/` — login, a project dashboard, and an interactive Gantt view per project — consuming the API built in `docs/superpowers/plans/2026-09-11-backend-api.md`.

**Architecture:** A Vite SPA with React Router. An `AuthContext` holds the JWT (persisted in `localStorage`) and an axios instance injects it into every request, redirecting to `/login` on a 401. `gantt-task-react` renders the Gantt; drag-to-reschedule, resize-to-change-duration, and progress-drag call `PATCH /tasks/:id` directly from the chart. **Dependencies are set through the task edit modal, not by drawing an arrow on the canvas** — `gantt-task-react` has no such interaction (see spec correction, 2026-09-11); the chart only renders the resulting arrows.

**Tech Stack:** React 18, Vite, TypeScript, React Router, Tailwind CSS, axios, `gantt-task-react`, Vitest + `@testing-library/react` for component tests.

**Spec:** `docs/superpowers/specs/2026-09-11-gantt-tasks-design.md`

**Depends on:** the backend API from `docs/superpowers/plans/2026-09-11-backend-api.md` (`POST /auth/login`, `GET/POST /projects`, `PATCH/DELETE /projects/:id`, `GET/POST /projects/:id/tasks`, `PATCH/DELETE /tasks/:id`, `GET /users`). Run the backend locally (`cd backend && npm run start:dev`, default `http://localhost:3000`) so manual smoke checks in this plan work; component tests mock the API and don't need it running.

## Global Constraints

- TypeScript `strict: true` (Vite's React-TS template default — keep it).
- Component tests: Vitest + `@testing-library/react`, file suffix `.test.tsx`, colocated next to the component. Run via `npm run test`.
- Tailwind CSS for all styling — no separate CSS files except the Tailwind entry and `gantt-task-react`'s required stylesheet import.
- The JWT is stored in `localStorage` under the key `br7_token`; a 401 from any API call clears it and redirects to `/login`.
- API base URL comes from `VITE_API_URL` (Vite env var, `.env` file, defaults to `http://localhost:3000` in dev).
- Dependencies between tasks are edited via a multi-select field in the task modal — never by dragging on the Gantt canvas.

---

## File Structure

```
frontend/
  .env.example                          (new — documents VITE_API_URL)
  tailwind.config.js                    (new)
  postcss.config.js                     (new)
  src/
    main.tsx                            (modify — Vite default)
    App.tsx                             (modify — router)
    index.css                           (modify — Tailwind directives)
    types.ts                            (new — Project, Task, User, Role)
    api/
      client.ts                         (new — axios instance + interceptors)
      auth.ts                           (new)
      projects.ts                       (new)
      tasks.ts                          (new)
      users.ts                          (new)
    auth/
      AuthContext.tsx                   (new)
      AuthContext.test.tsx              (new)
      ProtectedRoute.tsx                (new)
    pages/
      LoginPage.tsx                     (new)
      LoginPage.test.tsx                (new)
      DashboardPage.tsx                 (new)
      DashboardPage.test.tsx            (new)
      ProjectGanttPage.tsx              (new)
      ProjectGanttPage.test.tsx         (new)
    components/
      CreateProjectModal.tsx            (new)
      CreateTaskModal.tsx               (new)
      TaskEditModal.tsx                 (new)
      TaskEditModal.test.tsx            (new)
    gantt/
      mapTasksToGanttFormat.ts          (new — pure mapping fn)
      mapTasksToGanttFormat.test.ts     (new)
```

---

### Task 1: Scaffold the Vite React-TS app, Tailwind, test runner

**Files:**
- Create: the whole `frontend/` Vite scaffold (via `npm create vite@latest`)
- Create: `frontend/tailwind.config.js`, `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`
- Modify: `frontend/vite.config.ts` (add Vitest config)
- Create: `frontend/src/App.test.tsx` (smoke test)

- [ ] **Step 1: Scaffold the app**

Run (from the repo root):
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install
```

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install react-router-dom axios gantt-task-react
npm install -D tailwindcss postcss autoprefixer vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Configure Tailwind**

Run: `npx tailwindcss init -p`

Replace `frontend/tailwind.config.js` content array:
```javascript
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

Replace `frontend/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest inside `vite.config.ts`**

Replace `frontend/vite.config.ts`:
```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
});
```

Create `frontend/src/setupTests.ts`:
```typescript
import '@testing-library/jest-dom/vitest';
```

Add to `frontend/package.json` `scripts`:
```json
"test": "vitest run"
```

- [ ] **Step 5: Write a smoke test and verify the toolchain works**

Create `frontend/src/App.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(document.body).toBeTruthy();
  });
});
```

Run: `cd frontend && npm run test`
Expected: PASS (adjust `App.tsx` only if the default Vite template throws — it shouldn't).

- [ ] **Step 6: Verify the dev server and production build both work**

Run: `cd frontend && npm run build`
Expected: builds without TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "chore: scaffold React+Vite+TS frontend with Tailwind and Vitest

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Shared types, API client, AuthContext

**Files:**
- Create: `frontend/.env.example`
- Create: `frontend/src/types.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/auth.ts`
- Create: `frontend/src/auth/AuthContext.tsx`
- Create: `frontend/src/auth/AuthContext.test.tsx`

**Interfaces:**
- Produces: `apiClient` (configured axios instance) — every `api/*.ts` module (Tasks 3–6) imports it. `useAuth(): { token: string | null; user: AuthUser | null; login(email, password): Promise<void>; logout(): void }` — `LoginPage` and `ProtectedRoute` (Task 3) consume it. Types `Project`, `Task`, `User`, `Role` — every later file imports from `../types.js`.

- [ ] **Step 1: Document the env var**

Create `frontend/.env.example`:
```
VITE_API_URL=http://localhost:3000
```

Create `frontend/.env` (git-ignored, copy of the above) so local dev works out of the box.

- [ ] **Step 2: Write shared types matching the backend schemas**

Create `frontend/src/types.ts`:
```typescript
export type Role = 'admin' | 'member';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

export type ProjectStatus = 'active' | 'archived';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdBy: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Task {
  _id: string;
  name: string;
  projectId: string;
  startDate: string;
  endDate: string;
  progress: number;
  assigneeId?: string;
  dependencies: string[];
  status: TaskStatus;
}
```

- [ ] **Step 3: Write the axios client with auth injection and 401 handling**

Create `frontend/src/api/client.ts`:
```typescript
import axios from 'axios';

export const TOKEN_KEY = 'br7_token';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 4: Write the auth API call**

Create `frontend/src/api/auth.ts`:
```typescript
import { apiClient } from './client.js';

export function login(email: string, password: string) {
  return apiClient
    .post<{ accessToken: string }>('/auth/login', { email, password })
    .then((res) => res.data.accessToken);
}
```

- [ ] **Step 5: Write the failing test for AuthContext**

Create `frontend/src/auth/AuthContext.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.js';
import * as authApi from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';

function Probe() {
  const { token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'pw')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores the token on login and clears it on logout', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue('fake-jwt');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fake-jwt'));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-jwt');

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd frontend && npm run test -- AuthContext.test.tsx`
Expected: FAIL (module `./AuthContext.js` doesn't exist yet).

- [ ] **Step 7: Implement AuthContext**

Create `frontend/src/auth/AuthContext.tsx`:
```typescript
import { createContext, useContext, useState, type ReactNode } from 'react';
import { login as loginRequest } from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';

interface AuthContextValue {
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));

  async function login(email: string, password: string) {
    const accessToken = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npm run test -- AuthContext.test.tsx`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/client.ts frontend/src/api/auth.ts frontend/src/auth frontend/.env.example
git commit -m "feat(frontend): add types, axios client, AuthContext

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Router, LoginPage, ProtectedRoute

**Files:**
- Create: `frontend/src/auth/ProtectedRoute.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/LoginPage.test.tsx`
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 2).
- Produces: routes `/login`, `/` (dashboard, Task 4), `/projects/:id` (Gantt, Task 5) wired in `App.tsx`; `<ProtectedRoute>` wraps every authenticated route.

- [ ] **Step 1: Write ProtectedRoute**

Create `frontend/src/auth/ProtectedRoute.tsx`:
```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.js';

export function ProtectedRoute() {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}
```

- [ ] **Step 2: Write the failing test for LoginPage**

Create `frontend/src/pages/LoginPage.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { LoginPage } from './LoginPage.js';
import { AuthProvider } from '../auth/AuthContext.js';
import * as authApi from '../api/auth.js';

describe('LoginPage', () => {
  it('logs in and redirects on submit', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue('fake-jwt');

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@br7.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(authApi.login).toHaveBeenCalledWith('admin@br7.com', 'password123'));
  });

  it('shows an error message on invalid credentials', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new Error('Invalid credentials'));

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'admin@br7.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/credenciais inválidas/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- LoginPage.test.tsx`
Expected: FAIL (module `./LoginPage.js` doesn't exist yet).

- [ ] **Step 4: Implement LoginPage**

Create `frontend/src/pages/LoginPage.tsx`:
```typescript
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch {
      setError('Credenciais inválidas.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="w-80 space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-xl font-semibold text-gray-800">BR7 Tasks</h1>
        <div>
          <label htmlFor="email" className="block text-sm text-gray-600">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-600">
            Senha
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- LoginPage.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire the router in App.tsx**

Replace `frontend/src/App.tsx`:
```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProjectGanttPage } from './pages/ProjectGanttPage.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects/:id" element={<ProjectGanttPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

(`DashboardPage` and `ProjectGanttPage` are created in Tasks 4–5 — this step will not typecheck until then; that's expected and resolved by the end of Task 5.)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/auth/ProtectedRoute.tsx frontend/src/pages/LoginPage.tsx frontend/src/pages/LoginPage.test.tsx frontend/src/App.tsx
git commit -m "feat(frontend): add router, LoginPage, ProtectedRoute

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Dashboard page — list, create, archive projects

**Files:**
- Create: `frontend/src/api/projects.ts`
- Create: `frontend/src/components/CreateProjectModal.tsx`
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `apiClient` (Task 2), `Project` type (Task 2).
- Produces: `listProjects()`, `createProject(dto)`, `archiveProject(id)` in `api/projects.ts` — reused nowhere else in this plan, but this is the pattern `api/tasks.ts` (Task 5) follows.

- [ ] **Step 1: Write the projects API module**

Create `frontend/src/api/projects.ts`:
```typescript
import { apiClient } from './client.js';
import type { Project } from '../types.js';

export function listProjects() {
  return apiClient.get<Project[]>('/projects').then((res) => res.data);
}

export function createProject(dto: { name: string; description?: string }) {
  return apiClient.post<Project>('/projects', dto).then((res) => res.data);
}

export function archiveProject(id: string) {
  return apiClient.patch<Project>(`/projects/${id}`, { status: 'archived' }).then((res) => res.data);
}
```

- [ ] **Step 2: Write the failing test for DashboardPage**

Create `frontend/src/pages/DashboardPage.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { DashboardPage } from './DashboardPage.js';
import * as projectsApi from '../api/projects.js';
import type { Project } from '../types.js';

const projects: Project[] = [
  { _id: '1', name: 'Campanha X', status: 'active', createdBy: 'admin' },
];

describe('DashboardPage', () => {
  it('lists projects and creates a new one', async () => {
    vi.spyOn(projectsApi, 'listProjects').mockResolvedValue(projects);
    vi.spyOn(projectsApi, 'createProject').mockResolvedValue({
      _id: '2',
      name: 'Nova Campanha',
      status: 'active',
      createdBy: 'admin',
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Campanha X')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo projeto/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Nova Campanha');
    await userEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() =>
      expect(projectsApi.createProject).toHaveBeenCalledWith({
        name: 'Nova Campanha',
        description: undefined,
      }),
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- DashboardPage.test.tsx`
Expected: FAIL (module `./DashboardPage.js` doesn't exist yet).

- [ ] **Step 4: Implement CreateProjectModal**

Create `frontend/src/components/CreateProjectModal.tsx`:
```typescript
import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string; description?: string }) => void;
}

export function CreateProjectModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name, description: description || undefined });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo projeto</h2>
        <div>
          <label htmlFor="name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm text-gray-600">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Implement DashboardPage**

Create `frontend/src/pages/DashboardPage.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, archiveProject } from '../api/projects.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import type { Project } from '../types.js';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listProjects().then(setProjects);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string; description?: string }) {
    await createProject(dto);
    setShowModal(false);
    refresh();
  }

  async function handleArchive(id: string) {
    await archiveProject(id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Projetos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Novo projeto
        </button>
      </div>

      <ul className="space-y-3">
        {projects.map((project) => (
          <li
            key={project._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link to={`/projects/${project._id}`} className="font-medium text-blue-700 hover:underline">
              {project.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">{project.status}</span>
              {project.status === 'active' && (
                <button onClick={() => handleArchive(project._id)} className="text-sm text-gray-500 hover:text-gray-800">
                  Arquivar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd frontend && npm run test -- DashboardPage.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/api/projects.ts frontend/src/components/CreateProjectModal.tsx frontend/src/pages/DashboardPage.tsx frontend/src/pages/DashboardPage.test.tsx
git commit -m "feat(frontend): add Dashboard page (list/create/archive projects)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Gantt mapping util + tasks API + ProjectGanttPage (drag/resize/progress)

**Files:**
- Create: `frontend/src/api/tasks.ts`
- Create: `frontend/src/gantt/mapTasksToGanttFormat.ts`
- Create: `frontend/src/gantt/mapTasksToGanttFormat.test.ts`
- Create: `frontend/src/components/CreateTaskModal.tsx`
- Create: `frontend/src/pages/ProjectGanttPage.tsx`
- Create: `frontend/src/pages/ProjectGanttPage.test.tsx`

**Interfaces:**
- Consumes: `Task` type (Task 2), `gantt-task-react`'s `Task` type (library).
- Produces: `mapTasksToGanttFormat(tasks: Task[]): GanttTask[]` — Task 6 (`TaskEditModal`) reuses this file's exported `GanttTask` import path is not needed there, but the same `listTasks`/`updateTask`/`deleteTask` functions from `api/tasks.ts` are consumed by Task 6.

- [ ] **Step 1: Write the tasks API module**

Create `frontend/src/api/tasks.ts`:
```typescript
import { apiClient } from './client.js';
import type { Task } from '../types.js';

export function listTasks(projectId: string) {
  return apiClient.get<Task[]>(`/projects/${projectId}/tasks`).then((res) => res.data);
}

export function createTask(
  projectId: string,
  dto: { name: string; startDate: string; endDate: string; assigneeId?: string },
) {
  return apiClient.post<Task>(`/projects/${projectId}/tasks`, dto).then((res) => res.data);
}

export function updateTask(id: string, dto: Partial<Omit<Task, '_id' | 'projectId'>>) {
  return apiClient.patch<Task>(`/tasks/${id}`, dto).then((res) => res.data);
}

export function deleteTask(id: string) {
  return apiClient.delete(`/tasks/${id}`);
}
```

- [ ] **Step 2: Write the failing test for the mapping util**

Create `frontend/src/gantt/mapTasksToGanttFormat.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { mapTasksToGanttFormat } from './mapTasksToGanttFormat.js';
import type { Task } from '../types.js';

describe('mapTasksToGanttFormat', () => {
  it('maps backend tasks to gantt-task-react shape', () => {
    const tasks: Task[] = [
      {
        _id: 'a',
        name: 'Briefing',
        projectId: 'p1',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        progress: 50,
        dependencies: [],
        status: 'in_progress',
      },
      {
        _id: 'b',
        name: 'Produção',
        projectId: 'p1',
        startDate: '2026-01-06',
        endDate: '2026-01-10',
        progress: 0,
        dependencies: ['a'],
        status: 'todo',
      },
    ];

    const result = mapTasksToGanttFormat(tasks);

    expect(result).toEqual([
      {
        id: 'a',
        name: 'Briefing',
        type: 'task',
        start: new Date('2026-01-01'),
        end: new Date('2026-01-05'),
        progress: 50,
        dependencies: [],
        project: 'p1',
      },
      {
        id: 'b',
        name: 'Produção',
        type: 'task',
        start: new Date('2026-01-06'),
        end: new Date('2026-01-10'),
        progress: 0,
        dependencies: ['a'],
        project: 'p1',
      },
    ]);
  });

  it('returns an empty array for an empty task list', () => {
    expect(mapTasksToGanttFormat([])).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- mapTasksToGanttFormat.test.ts`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 4: Implement the mapping util**

Create `frontend/src/gantt/mapTasksToGanttFormat.ts`:
```typescript
import type { Task as GanttTask } from 'gantt-task-react';
import type { Task } from '../types.js';

export function mapTasksToGanttFormat(tasks: Task[]): GanttTask[] {
  return tasks.map((task) => ({
    id: task._id,
    name: task.name,
    type: 'task',
    start: new Date(task.startDate),
    end: new Date(task.endDate),
    progress: task.progress,
    dependencies: task.dependencies,
    project: task.projectId,
  }));
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- mapTasksToGanttFormat.test.ts`
Expected: PASS

- [ ] **Step 6: Implement CreateTaskModal**

Create `frontend/src/components/CreateTaskModal.tsx`:
```typescript
import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string; startDate: string; endDate: string }) => void;
}

export function CreateTaskModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name, startDate, endDate });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Nova tarefa</h2>
        <div>
          <label htmlFor="task-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="task-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-sm text-gray-600">
              Início
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="end-date" className="block text-sm text-gray-600">
              Fim
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Write the failing test for ProjectGanttPage**

Create `frontend/src/pages/ProjectGanttPage.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ProjectGanttPage } from './ProjectGanttPage.js';
import * as tasksApi from '../api/tasks.js';
import type { Task } from '../types.js';

const tasks: Task[] = [
  {
    _id: 'a',
    name: 'Briefing',
    projectId: 'p1',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    progress: 0,
    dependencies: [],
    status: 'todo',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/projects/p1']}>
      <Routes>
        <Route path="/projects/:id" element={<ProjectGanttPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProjectGanttPage', () => {
  it('loads and displays the project tasks', async () => {
    vi.spyOn(tasksApi, 'listTasks').mockResolvedValue(tasks);

    renderPage();

    expect(await screen.findByText('Briefing')).toBeInTheDocument();
  });

  it('creates a task via the modal and refreshes the list', async () => {
    vi.spyOn(tasksApi, 'listTasks').mockResolvedValue(tasks);
    vi.spyOn(tasksApi, 'createTask').mockResolvedValue({
      _id: 'b',
      name: 'Produção',
      projectId: 'p1',
      startDate: '2026-01-06',
      endDate: '2026-01-10',
      progress: 0,
      dependencies: [],
      status: 'todo',
    });

    renderPage();
    await screen.findByText('Briefing');

    await userEvent.click(screen.getByRole('button', { name: /adicionar tarefa/i }));
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'Produção');
    await userEvent.type(screen.getByLabelText(/início/i), '2026-01-06');
    await userEvent.type(screen.getByLabelText(/fim/i), '2026-01-10');
    await userEvent.click(screen.getByRole('button', { name: /criar/i }));

    await waitFor(() =>
      expect(tasksApi.createTask).toHaveBeenCalledWith('p1', {
        name: 'Produção',
        startDate: '2026-01-06',
        endDate: '2026-01-10',
      }),
    );
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `cd frontend && npm run test -- ProjectGanttPage.test.tsx`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 9: Implement ProjectGanttPage**

Create `frontend/src/pages/ProjectGanttPage.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Gantt, ViewMode, type Task as GanttTask } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { listTasks, createTask, updateTask } from '../api/tasks.js';
import { mapTasksToGanttFormat } from '../gantt/mapTasksToGanttFormat.js';
import { CreateTaskModal } from '../components/CreateTaskModal.js';
import type { Task } from '../types.js';

export function ProjectGanttPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    if (!projectId) return;
    listTasks(projectId).then(setTasks);
  }

  useEffect(refresh, [projectId]);

  async function handleDateChange(ganttTask: GanttTask) {
    setError(null);
    try {
      await updateTask(ganttTask.id, {
        startDate: ganttTask.start.toISOString(),
        endDate: ganttTask.end.toISOString(),
      });
      refresh();
    } catch {
      setError('Não foi possível atualizar as datas.');
      refresh();
    }
  }

  async function handleProgressChange(ganttTask: GanttTask) {
    setError(null);
    try {
      await updateTask(ganttTask.id, { progress: ganttTask.progress });
      refresh();
    } catch {
      setError('Não foi possível atualizar o progresso.');
      refresh();
    }
  }

  async function handleCreate(dto: { name: string; startDate: string; endDate: string }) {
    if (!projectId) return;
    await createTask(projectId, dto);
    setShowCreateModal(false);
    refresh();
  }

  const ganttTasks = mapTasksToGanttFormat(tasks);

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gantt do projeto</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Adicionar tarefa
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {ganttTasks.length > 0 ? (
        <Gantt
          tasks={ganttTasks}
          viewMode={ViewMode.Day}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
        />
      ) : (
        <p className="text-gray-500">Nenhuma tarefa ainda.</p>
      )}

      {showCreateModal && (
        <CreateTaskModal onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `cd frontend && npm run test -- ProjectGanttPage.test.tsx`
Expected: PASS

- [ ] **Step 11: Run the full test suite and the production build**

Run: `cd frontend && npm run test && npm run build`
Expected: PASS / builds cleanly (this also confirms `App.tsx` from Task 3 now typechecks, since `DashboardPage` and `ProjectGanttPage` both exist).

- [ ] **Step 12: Commit**

```bash
git add frontend/src/api/tasks.ts frontend/src/gantt frontend/src/components/CreateTaskModal.tsx frontend/src/pages/ProjectGanttPage.tsx frontend/src/pages/ProjectGanttPage.test.tsx
git commit -m "feat(frontend): add ProjectGanttPage with drag/resize/progress editing

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: TaskEditModal — name, assignee, progress, dependencies, delete

**Files:**
- Create: `frontend/src/api/users.ts`
- Create: `frontend/src/components/TaskEditModal.tsx`
- Create: `frontend/src/components/TaskEditModal.test.tsx`
- Modify: `frontend/src/pages/ProjectGanttPage.tsx`

**Interfaces:**
- Consumes: `updateTask`, `deleteTask` (Task 5), `User` type (Task 2).
- Produces: nothing consumed further — this is the last piece of the Gantt page.

- [ ] **Step 1: Write the users API module**

Create `frontend/src/api/users.ts`:
```typescript
import { apiClient } from './client.js';
import type { User } from '../types.js';

export function listUsers() {
  return apiClient.get<User[]>('/users').then((res) => res.data);
}
```

- [ ] **Step 2: Write the failing test for TaskEditModal**

Create `frontend/src/components/TaskEditModal.test.tsx`:
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskEditModal } from './TaskEditModal.js';
import * as usersApi from '../api/users.js';
import type { Task, User } from '../types.js';

const task: Task = {
  _id: 'b',
  name: 'Produção',
  projectId: 'p1',
  startDate: '2026-01-06',
  endDate: '2026-01-10',
  progress: 0,
  dependencies: [],
  status: 'todo',
};

const otherTasks: Task[] = [
  {
    _id: 'a',
    name: 'Briefing',
    projectId: 'p1',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    progress: 100,
    dependencies: [],
    status: 'done',
  },
];

const users: User[] = [{ _id: 'u1', name: 'Alef', email: 'a@br7.com', role: 'member' }];

describe('TaskEditModal', () => {
  it('submits the selected predecessor as a dependency', async () => {
    vi.spyOn(usersApi, 'listUsers').mockResolvedValue(users);
    const onSave = vi.fn();

    render(
      <TaskEditModal
        task={task}
        otherTasks={otherTasks}
        onClose={() => {}}
        onSave={onSave}
        onDelete={() => {}}
      />,
    );

    await screen.findByText('Alef');
    await userEvent.click(screen.getByLabelText('Briefing'));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ dependencies: ['a'] }),
      ),
    );
  });

  it('calls onDelete when the delete button is clicked', async () => {
    vi.spyOn(usersApi, 'listUsers').mockResolvedValue(users);
    const onDelete = vi.fn();

    render(
      <TaskEditModal
        task={task}
        otherTasks={otherTasks}
        onClose={() => {}}
        onSave={() => {}}
        onDelete={onDelete}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /excluir/i }));
    expect(onDelete).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npm run test -- TaskEditModal.test.tsx`
Expected: FAIL (module doesn't exist yet).

- [ ] **Step 4: Implement TaskEditModal**

Create `frontend/src/components/TaskEditModal.tsx`:
```typescript
import { useEffect, useState, type FormEvent } from 'react';
import { listUsers } from '../api/users.js';
import type { Task, TaskStatus, User } from '../types.js';

interface Props {
  task: Task;
  otherTasks: Task[];
  onClose: () => void;
  onSave: (dto: Partial<Omit<Task, '_id' | 'projectId'>>) => void;
  onDelete: (id: string) => void;
}

export function TaskEditModal({ task, otherTasks, onClose, onSave, onDelete }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState(task.name);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies);

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  function toggleDependency(id: string) {
    setDependencies((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, assigneeId: assigneeId || undefined, status, dependencies });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Editar tarefa</h2>

        <div>
          <label htmlFor="edit-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>

        <div>
          <label htmlFor="assignee" className="block text-sm text-gray-600">
            Responsável
          </label>
          <select
            id="assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Sem responsável</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm text-gray-600">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="todo">A fazer</option>
            <option value="in_progress">Em andamento</option>
            <option value="done">Concluída</option>
          </select>
        </div>

        <fieldset>
          <legend className="block text-sm text-gray-600">Predecessoras</legend>
          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto">
            {otherTasks.map((other) => (
              <label key={other._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dependencies.includes(other._id)}
                  onChange={() => toggleDependency(other._id)}
                />
                {other.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="rounded px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
              Cancelar
            </button>
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
              Salvar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npm run test -- TaskEditModal.test.tsx`
Expected: PASS

- [ ] **Step 6: Wire TaskEditModal into ProjectGanttPage**

In `frontend/src/pages/ProjectGanttPage.tsx`:

Add imports:
```typescript
import { TaskEditModal } from '../components/TaskEditModal.js';
import { deleteTask } from '../api/tasks.js';
```

Add state and handlers inside `ProjectGanttPage`:
```typescript
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const selectedTask = tasks.find((t) => t._id === selectedTaskId) ?? null;

async function handleTaskSave(dto: Partial<Omit<Task, '_id' | 'projectId'>>) {
  if (!selectedTaskId) return;
  setError(null);
  try {
    await updateTask(selectedTaskId, dto);
    setSelectedTaskId(null);
    refresh();
  } catch {
    setError('Não foi possível salvar a tarefa (verifique se não criou um ciclo de dependência).');
  }
}

async function handleTaskDelete(id: string) {
  await deleteTask(id);
  setSelectedTaskId(null);
  refresh();
}
```

Pass `onClick={(ganttTask) => setSelectedTaskId(ganttTask.id)}` to the `<Gantt />` element, and render the modal at the end of the JSX, right after `CreateTaskModal`:
```typescript
{selectedTask && (
  <TaskEditModal
    task={selectedTask}
    otherTasks={tasks.filter((t) => t._id !== selectedTask._id)}
    onClose={() => setSelectedTaskId(null)}
    onSave={handleTaskSave}
    onDelete={handleTaskDelete}
  />
)}
```

- [ ] **Step 7: Run the full frontend test suite and build**

Run: `cd frontend && npm run test && npm run build`
Expected: PASS / builds cleanly.

- [ ] **Step 8: Manual smoke check against the real backend**

With the backend running (`cd backend && npm run start:dev`) and frontend dev server up (`cd frontend && npm run dev`):
1. Open `http://localhost:5173`, confirm redirect to `/login`.
2. Log in with the seeded admin (`ADMIN_EMAIL`/`ADMIN_PASSWORD` from `backend/.env`).
3. Create a project, open it, add two tasks, drag one to reschedule it, open the edit modal on the second and set the first as its predecessor, save, confirm the dependency arrow renders.
4. Try to set a cycle (predecessor's own predecessor list containing the successor) and confirm the error message shows and nothing breaks.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/users.ts frontend/src/components/TaskEditModal.tsx frontend/src/components/TaskEditModal.test.tsx frontend/src/pages/ProjectGanttPage.tsx
git commit -m "feat(frontend): add TaskEditModal (assignee, status, dependencies, delete)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

## Self-Review Notes

- **Spec coverage:** login/JWT (Task 2–3), dashboard CRUD (Task 4), Gantt drag/resize/progress (Task 5), dependency editing via form (Task 6), assignee + status (Task 6) — every frontend requirement in the (corrected) spec maps to a task.
- **Type consistency checked:** `Task`/`Project`/`User` field names in `types.ts` match the backend DTOs/schemas field-for-field (`assigneeId`, `dependencies`, `progress`, `status`). `mapTasksToGanttFormat`'s output shape matches `gantt-task-react`'s documented `Task` type (`id`, `name`, `type`, `start`, `end`, `progress`, `dependencies`, `project`). `TaskEditModal`'s `onSave` payload type (`Partial<Omit<Task, '_id' | 'projectId'>>`) matches `updateTask`'s parameter type in `api/tasks.ts`.
- **No placeholders:** every step has runnable code; no "TBD"/"add validation" left unresolved.
- **Known library limitation carried into the design:** dependency creation is a form field, not a canvas drag — flagged explicitly in the Architecture section and the spec, so no task silently assumes otherwise.
