import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { StageTemplatesPage } from './StageTemplatesPage.js';
import * as stageTemplatesApi from '../api/stageTemplates.js';
import type { StageTemplate } from '../types.js';

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
    <MemoryRouter initialEntries={['/tipos-servico/st1/etapas']}>
      <Routes>
        <Route path="/tipos-servico/:serviceTypeId/etapas" element={<StageTemplatesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StageTemplatesPage', () => {
  it('lists stages in order and creates a new one', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(stageTemplatesApi, 'createStageTemplate').mockResolvedValue({
      _id: 's3',
      serviceTypeId: 'st1',
      order: 2,
      name: 'LinkedIn',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
    });

    renderPage();

    const items = await screen.findAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Briefing');
    expect(items[1]).toHaveTextContent('Facebook');

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'LinkedIn');
    await userEvent.selectOptions(screen.getByLabelText(/setor/i), 'criacao');
    await userEvent.type(screen.getByLabelText(/duração/i), '1');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(stageTemplatesApi.createStageTemplate).toHaveBeenCalledWith('st1', {
        name: 'LinkedIn',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
      }),
    );
  });

  it('moves a stage down via the reorder button', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(stageTemplatesApi, 'reorderStageTemplates').mockResolvedValue([stages[1], stages[0]]);

    renderPage();
    await screen.findByText('Briefing');

    const downButtons = screen.getAllByRole('button', { name: /mover para baixo/i });
    await userEvent.click(downButtons[0]);

    await waitFor(() =>
      expect(stageTemplatesApi.reorderStageTemplates).toHaveBeenCalledWith('st1', ['s2', 's1']),
    );
  });
});
