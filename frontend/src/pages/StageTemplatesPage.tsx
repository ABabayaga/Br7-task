import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  listStageTemplates,
  createStageTemplate,
  updateStageTemplate,
  deleteStageTemplate,
  reorderStageTemplates,
} from '../api/stageTemplates.js';
import { StageTemplateModal } from '../components/StageTemplateModal.js';
import { SECTOR_LABELS, type Sector, type StageTemplate } from '../types.js';

export function StageTemplatesPage() {
  const { serviceTypeId } = useParams<{ serviceTypeId: string }>();
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [modalStage, setModalStage] = useState<StageTemplate | 'new' | null>(null);

  function refresh() {
    if (serviceTypeId) {
      listStageTemplates(serviceTypeId).then(setStages);
    }
  }

  useEffect(refresh, [serviceTypeId]);

  async function handleSave(dto: { name: string; defaultSector: Sector; defaultDurationDays: number }) {
    if (!serviceTypeId) return;
    if (modalStage && modalStage !== 'new') {
      await updateStageTemplate(modalStage._id, dto);
    } else {
      await createStageTemplate(serviceTypeId, dto);
    }
    setModalStage(null);
    refresh();
  }

  async function handleDelete(id: string) {
    await deleteStageTemplate(id);
    refresh();
  }

  async function handleMove(index: number, direction: -1 | 1) {
    if (!serviceTypeId) return;
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    await reorderStageTemplates(serviceTypeId, reordered.map((s) => s._id));
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Etapas do template</h1>
        <button
          onClick={() => setModalStage('new')}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Nova etapa
        </button>
      </div>

      <ul className="space-y-3">
        {stages.map((stage, index) => (
          <li
            key={stage._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-gray-800">{stage.name}</p>
              <p className="text-sm text-gray-500">
                {SECTOR_LABELS[stage.defaultSector]} · {stage.defaultDurationDays} dia(s)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                aria-label="Mover para cima"
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
                className="rounded px-2 py-1 text-gray-500 hover:text-gray-800 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                aria-label="Mover para baixo"
                disabled={index === stages.length - 1}
                onClick={() => handleMove(index, 1)}
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
                onClick={() => handleDelete(stage._id)}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>

      {modalStage && (
        <StageTemplateModal
          initial={modalStage === 'new' ? undefined : modalStage}
          onClose={() => setModalStage(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
