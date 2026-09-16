import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ClientsPage } from './ClientsPage.js';
import * as clientsApi from '../api/clients.js';
import type { Client } from '../types.js';

const clients: Client[] = [{ _id: 'c1', name: 'Upper GR', active: true }];

describe('ClientsPage', () => {
  it('lists clients and creates a new one', async () => {
    vi.spyOn(clientsApi, 'listClients').mockResolvedValue(clients);
    vi.spyOn(clientsApi, 'createClient').mockResolvedValue({
      _id: 'c2',
      name: 'Nova Empresa',
      active: true,
    });

    render(
      <MemoryRouter>
        <ClientsPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Upper GR')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /novo cliente/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Nova Empresa');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(clientsApi.createClient).toHaveBeenCalledWith({ name: 'Nova Empresa' }),
    );
  });
});
