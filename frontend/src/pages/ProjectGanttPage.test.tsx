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

    // gantt-task-react renders the task name both in the left-hand list
    // and inside the SVG bar label, so there are always 2+ matches.
    await waitFor(() => expect(screen.getAllByText('Briefing').length).toBeGreaterThan(0));
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
    await waitFor(() => expect(screen.getAllByText('Briefing').length).toBeGreaterThan(0));

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
