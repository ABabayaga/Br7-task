import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listStageTemplates,
  createStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  reorderStageTemplates,
} from '../api/stageTemplates.js';
import {
  listPhases,
  createPhase,
  updatePhase,
  deletePhase,
  reorderPhases,
} from '../api/phases.js';
import { StageTemplateModal } from '../components/StageTemplateModal.js';
import { PhaseModal } from '../components/PhaseModal.js';
import { SECTOR_LABELS, type Phase, type Sector, type StageTemplate } from '../types.js';

export function StageTemplatesPage() {
  const { serviceTypeId } = useParams<{ serviceTypeId: string }>();
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [modalStage, setModalStage] = useState<StageTemplate | 'new' | null>(null);
  const [modalPhase, setModalPhase] = useState<Phase | 'new' | null>(null);

  function refresh() {
    if (!serviceTypeId) return;
    listStageTemplates(serviceTypeId).then(setStages);
    listPhases(serviceTypeId).then(setPhases);
  }

  useEffect(refresh, [serviceTypeId]);

  async function handleSaveStage(dto: {
    name: string;
    defaultSector: Sector;
    defaultDurationDays: number;
    phaseId?: string | null;
  }) {
    if (!serviceTypeId) return;
    if (modalStage && modalStage !== 'new') {
      await updateStageTemplate(modalStage._id, dto);
    } else {
      await createStageTemplate(serviceTypeId, { ...dto, phaseId: dto.phaseId ?? undefined });
    }
    setModalStage(null);
    refresh();
  }

  async function handleDeleteStage(id: string) {
    await deleteStageTemplate(id);
    refresh();
  }

  async function handleToggleStageActive(stage: StageTemplate) {
    await updateStageTemplate(stage._id, { active: !stage.active });
    refresh();
  }

  interface StageGroup {
    key: string;
    label: string;
    phase: Phase | null;
    stages: StageTemplate[];
  }

  const stageGroups: StageGroup[] = [
    ...phases.map((phase) => ({
      key: phase._id,
      label: phase.name,
      phase,
      stages: stages.filter((s) => s.phaseId === phase._id),
    })),
    {
      key: 'none',
      label: 'Sem fase',
      phase: null,
      stages: stages.filter((s) => !s.phaseId || !phases.some((p) => p._id === s.phaseId)),
    },
  ].filter((group) => group.stages.length > 0);

  async function handleMoveStageWithinGroup(
    group: StageGroup,
    stage: StageTemplate,
    direction: -1 | 1,
  ) {
    if (!serviceTypeId) return;
    const groupIds = group.stages.map((s) => s._id);
    const indexInGroup = groupIds.indexOf(stage._id);
    const targetIndexInGroup = indexInGroup + direction;
    if (targetIndexInGroup < 0 || targetIndexInGroup >= groupIds.length) return;
    [groupIds[indexInGroup], groupIds[targetIndexInGroup]] = [
      groupIds[targetIndexInGroup],
      groupIds[indexInGroup],
    ];

    // Flatten every group back in (phase order, then in-group order) —
    // this becomes the new flat `order` sequence the backend stores,
    // matching what the grouped UI displays.
    const flattened = stageGroups.flatMap((g) => (g.key === group.key ? groupIds : g.stages.map((s) => s._id)));
    await reorderStageTemplates(serviceTypeId, flattened);
    refresh();
  }

  async function handleSavePhase(dto: {
    name: string;
    color: string;
    startDay: number;
    endDay: number;
  }) {
    if (!serviceTypeId) return;
    if (modalPhase && modalPhase !== 'new') {
      await updatePhase(modalPhase._id, dto);
    } else {
      await createPhase(serviceTypeId, dto);
    }
    setModalPhase(null);
    refresh();
  }

  async function handleDeletePhase(id: string) {
    await deletePhase(id);
    refresh();
  }

  async function handleTogglePhaseActive(phase: Phase) {
    await updatePhase(phase._id, { active: !phase.active });
    refresh();
  }

  async function handleMovePhase(index: number, direction: -1 | 1) {
    if (!serviceTypeId) return;
    const target = index + direction;
    if (target < 0 || target >= phases.length) return;
    const reordered = [...phases];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await reorderPhases(serviceTypeId, reordered.map((p) => p._id));
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Fases</h1>
        <button
          onClick={() => setModalPhase('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova fase
        </button>
      </div>

      <ul className="mb-10 space-y-3">
        {phases.map((phase, index) => (
          <li
            key={phase._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 rounded"
                style={{ backgroundColor: phase.color }}
                aria-hidden="true"
              />
              <div>
                <p className="font-medium text-gray-800">
                  {phase.name}
                  {!phase.active && <span className="ml-2 text-xs text-gray-400">(arquivada)</span>}
                </p>
                <p className="text-sm text-gray-500">
                  dias {phase.startDay}–{phase.endDay}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Mover fase para cima"
                disabled={index === 0}
                onClick={() => handleMovePhase(index, -1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                aria-label="Mover fase para baixo"
                disabled={index === phases.length - 1}
                onClick={() => handleMovePhase(index, 1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                onClick={() => setModalPhase(phase)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                Editar
              </button>
              <button
                onClick={() => handleTogglePhaseActive(phase)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {phase.active ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDeletePhase(phase._id)}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Etapas do template padrão</h2>
        <button
          onClick={() => setModalStage('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova etapa
        </button>
      </div>

      {stageGroups.map((group) => (
        <div key={group.key} className="mb-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase text-gray-500">
            {group.phase && (
              <span
                className="h-3 w-3 rounded"
                style={{ backgroundColor: group.phase.color }}
                aria-hidden="true"
              />
            )}
            {group.label}
          </h3>
          <ul className="space-y-3">
            {group.stages.map((stage) => (
              <li
                key={stage._id}
                className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {stage.name}
                    {!stage.active && <span className="ml-2 text-xs text-gray-400">(arquivada)</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    {SECTOR_LABELS[stage.defaultSector]} · {stage.defaultDurationDays} dia(s)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Mover para cima"
                    disabled={group.stages[0]._id === stage._id}
                    onClick={() => handleMoveStageWithinGroup(group, stage, -1)}
                    className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    aria-label="Mover para baixo"
                    disabled={group.stages[group.stages.length - 1]._id === stage._id}
                    onClick={() => handleMoveStageWithinGroup(group, stage, 1)}
                    className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setModalStage(stage)}
                    className="text-sm text-gray-500 hover:text-gray-800"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleStageActive(stage)}
                    className="text-sm text-gray-500 hover:text-gray-800"
                  >
                    {stage.active ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDeleteStage(stage._id)}
                    className="text-sm text-gray-500 hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {modalStage && (
        <StageTemplateModal
          initial={modalStage === 'new' ? undefined : modalStage}
          phases={phases}
          onClose={() => setModalStage(null)}
          onSave={handleSaveStage}
        />
      )}

      {modalPhase && (
        <PhaseModal
          initial={modalPhase === 'new' ? undefined : modalPhase}
          onClose={() => setModalPhase(null)}
          onSave={handleSavePhase}
        />
      )}
    </div>
  );
}
