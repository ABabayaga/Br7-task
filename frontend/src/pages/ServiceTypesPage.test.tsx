import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ServiceTypesPage } from './ServiceTypesPage.js';
import * as serviceTypesApi from '../api/serviceTypes.js';
import type { ServiceType } from '../types.js';

const serviceTypes: ServiceType[] = [{ _id: 'st1', name: 'Social Media', active: true }];

describe('ServiceTypesPage', () => {
  it('lists service types and creates a new one', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(serviceTypesApi, 'createServiceType').mockResolvedValue({
      _id: 'st2',
      name: 'Site',
      active: true,
    });

    render(
      <MemoryRouter>
        <ServiceTypesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Social Media')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo tipo de serviço/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Site');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(serviceTypesApi.createServiceType).toHaveBeenCalledWith({ name: 'Site' }),
    );
  });

  it('toggles a service type active state', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(serviceTypesApi, 'updateServiceType').mockResolvedValue({
      _id: 'st1',
      name: 'Social Media',
      active: false,
    });

    render(
      <MemoryRouter>
        <ServiceTypesPage />
      </MemoryRouter>,
    );
    await screen.findByText('Social Media');

    await userEvent.click(screen.getByRole('button', { name: /desativar/i }));

    await waitFor(() =>
      expect(serviceTypesApi.updateServiceType).toHaveBeenCalledWith('st1', { active: false }),
    );
  });
});
