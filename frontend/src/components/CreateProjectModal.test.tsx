import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreateProjectModal } from './CreateProjectModal.js';
import type { Client, ServiceType } from '../types.js';

const clients: Client[] = [{ _id: 'c1', name: 'Cliente A', active: true }];
const serviceTypes: ServiceType[] = [{ _id: 's1', name: 'Social Media', active: true }];

describe('CreateProjectModal', () => {
  it('blocks submission when there is no client to select', () => {
    render(
      <CreateProjectModal
        clients={[]}
        serviceTypes={serviceTypes}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Criar' })).toBeDisabled();
  });

  it('allows submission once a client is available', () => {
    render(
      <CreateProjectModal
        clients={clients}
        serviceTypes={serviceTypes}
        onClose={vi.fn()}
        onCreate={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: 'Criar' })).toBeEnabled();
  });
});
