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
