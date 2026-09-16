import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listServiceTypes } from '../api/serviceTypes.js';
import { listStageTemplates } from '../api/stageTemplates.js';
import { getClientOverride, setClientOverride } from '../api/clients.js';
import type { ServiceType, StageTemplate } from '../types.js';

export function ClientOverridesPage() {
  const { clientId } = useParams<{ clientId: string }>();
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string | null>(null);
  const [stages, setStages] = useState<StageTemplate[]>([]);
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    listServiceTypes().then((types) => {
      const active = types.filter((t) => t.active);
      setServiceTypes(active);
      setSelectedServiceTypeId((current) => current ?? active[0]?._id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!clientId || !selectedServiceTypeId) return;
    listStageTemplates(selectedServiceTypeId).then(setStages);
    getClientOverride(clientId, selectedServiceTypeId).then((ids) => setDisabledIds(new Set(ids)));
  }, [clientId, selectedServiceTypeId]);

  function toggle(stageId: string) {
    setDisabledIds((current) => {
      const next = new Set(current);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (!clientId || !selectedServiceTypeId) return;
    await setClientOverride(clientId, selectedServiceTypeId, [...disabledIds]);
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Etapas ativas do cliente</h1>

      <div className="mb-6 flex gap-2">
        {serviceTypes.map((serviceType) => (
          <button
            key={serviceType._id}
            onClick={() => setSelectedServiceTypeId(serviceType._id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              selectedServiceTypeId === serviceType._id
                ? 'bg-[#E0176A] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {serviceType.name}
          </button>
        ))}
      </div>

      <ul className="mb-6 space-y-3">
        {stages.map((stage) => (
          <li
            key={stage._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <span className="font-medium text-gray-800">{stage.name}</span>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                aria-label={stage.name}
                checked={!disabledIds.has(stage._id)}
                onChange={() => toggle(stage._id)}
              />
              Ativa
            </label>
          </li>
        ))}
      </ul>

      <button
        onClick={handleSave}
        className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
      >
        Salvar
      </button>
    </div>
  );
}
