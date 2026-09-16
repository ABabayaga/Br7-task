import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { StageTemplatesPage } from './StageTemplatesPage.js';
import * as stageTemplatesApi from '../api/stageTemplates.js';
import * as phasesApi from '../api/phases.js';
import type { Phase, StageTemplate } from '../types.js';

const stages: StageTemplate[] = [
  {
    _id: 's1',
    serviceTypeId: 'st1',
    order: 0,
    name: 'Briefing',
    defaultSector: 'diretoria_criacao',
    defaultDurationDays: 2,
    active: true,
  },
  {
    _id: 's2',
    serviceTypeId: 'st1',
    order: 1,
    name: 'Facebook',
    defaultSector: 'criacao',
    defaultDurationDays: 1,
    active: true,
  },
];

const phases: Phase[] = [
  { _id: 'ph1', serviceTypeId: 'st1', name: 'Fase I', color: '#2563EB', order: 0, startDay: 1, endDay: 2, active: true },
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
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue([]);
    vi.spyOn(stageTemplatesApi, 'createStageTemplate').mockResolvedValue({
      _id: 's3',
      serviceTypeId: 'st1',
      order: 2,
      name: 'LinkedIn',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      active: true,
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
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue([]);
    vi.spyOn(stageTemplatesApi, 'reorderStageTemplates').mockResolvedValue([stages[1], stages[0]]);

    renderPage();
    await screen.findByText('Briefing');

    const downButtons = screen.getAllByRole('button', { name: /mover para baixo/i });
    await userEvent.click(downButtons[0]);

    await waitFor(() =>
      expect(stageTemplatesApi.reorderStageTemplates).toHaveBeenCalledWith('st1', ['s2', 's1']),
    );
  });

  it('lists phases and creates a new one', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue([]);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(phasesApi, 'createPhase').mockResolvedValue({
      _id: 'ph2',
      serviceTypeId: 'st1',
      name: 'Fase II',
      color: '#3B82F6',
      order: 1,
      startDay: 1,
      endDay: 4,
      active: true,
    });

    renderPage();

    expect(await screen.findByText('Fase I')).toBeInTheDocument();
    expect(screen.getByText('dias 1–2')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /nova fase/i }));
    await userEvent.type(screen.getByLabelText(/nome da fase/i), 'Fase II');
    await userEvent.type(screen.getByLabelText(/dia inicial/i), '1');
    await userEvent.type(screen.getByLabelText(/dia final/i), '4');
    await userEvent.click(screen.getByRole('button', { name: /^salvar fase$/i }));

    await waitFor(() =>
      expect(phasesApi.createPhase).toHaveBeenCalledWith('st1', {
        name: 'Fase II',
        color: expect.any(String),
        startDay: 1,
        endDay: 4,
      }),
    );
  });

  it('archives a phase', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue([]);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(phasesApi, 'updatePhase').mockResolvedValue({ ...phases[0], active: false });

    renderPage();
    await screen.findByText('Fase I');

    await userEvent.click(screen.getByRole('button', { name: /^desativar$/i }));

    await waitFor(() =>
      expect(phasesApi.updatePhase).toHaveBeenCalledWith('ph1', { active: false }),
    );
  });

  it('shows a Fase select in the stage modal and sends the chosen phaseId', async () => {
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stages);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);
    vi.spyOn(stageTemplatesApi, 'createStageTemplate').mockResolvedValue({
      _id: 's3',
      serviceTypeId: 'st1',
      order: 2,
      name: 'LinkedIn',
      defaultSector: 'criacao',
      defaultDurationDays: 1,
      active: true,
    });

    renderPage();
    await screen.findByText('Briefing');

    await userEvent.click(screen.getByRole('button', { name: /nova etapa/i }));
    await userEvent.type(screen.getByLabelText(/^nome$/i), 'LinkedIn');
    await userEvent.selectOptions(screen.getByLabelText(/setor/i), 'criacao');
    await userEvent.type(screen.getByLabelText(/duração/i), '1');
    await userEvent.selectOptions(screen.getByLabelText(/^fase$/i), 'ph1');
    await userEvent.click(screen.getByRole('button', { name: /^salvar$/i }));

    await waitFor(() =>
      expect(stageTemplatesApi.createStageTemplate).toHaveBeenCalledWith('st1', {
        name: 'LinkedIn',
        defaultSector: 'criacao',
        defaultDurationDays: 1,
        phaseId: 'ph1',
      }),
    );
  });

  it('groups stages under their Fase heading, with ungrouped stages under Sem fase', async () => {
    const stagesWithPhase = [
      { ...stages[0], phaseId: 'ph1' },
      { ...stages[1], phaseId: undefined },
    ];
    vi.spyOn(stageTemplatesApi, 'listStageTemplates').mockResolvedValue(stagesWithPhase);
    vi.spyOn(phasesApi, 'listPhases').mockResolvedValue(phases);

    renderPage();

    await screen.findByText('Briefing');
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(['Fase I', 'Sem fase']);
  });
});
