import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ClientOverridesPage } from './ClientOverridesPage.js';
import * as serviceTypesApi from '../api/serviceTypes.js';
import * as stageTemplatesApi from '../api/stageTemplates.js';
import * as clientsApi from '../api/clients.js';
import type { ServiceType, StageTemplate } from '../types.js';

const serviceTypes: ServiceType[] = [{ _id: 'st1', name: 'Social Media', active: true }];
const stages: StageTemplate[] = [
  {
    _id: 's1',
    serviceTypeId: 'st1',
    order: 0,
    name: 'Briefing',
    defaultSector: 'diretoria_criacao',
    defaultDurationDays: 2,
  },
  {
    _id: 's2',
    serviceTypeId: 'st1',
    order: 1,
    name: 'Facebook',
    defaultSector: 'criacao',
    defaultDurationDays: 1,
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/clientes/c1']}>
      <Routes>
        <Route path="/clientes/:clientId" element={<ClientOverridesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ClientOverridesPage', () => {
  it('lists the stages of the selected service type and toggles one off', async () => {
    vi.spyOn(serviceTypesApi, 'listServiceTypes').mockResolvedValue(serviceTypes);
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(clientsApi, 'getClientOverride').mockResolvedValue([]);
    vi.spyOn(clientsApi, 'setClientOverride').mockResolvedValue(undefined);

    renderPage();

    expect(await screen.findByText('Briefing')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Facebook'));
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }));

    await waitFor(() =>
      expect(clientsApi.setClientOverride).toHaveBeenCalledWith('c1', 'st1', ['s2']),
    );
  });
});
