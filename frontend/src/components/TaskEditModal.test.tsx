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
