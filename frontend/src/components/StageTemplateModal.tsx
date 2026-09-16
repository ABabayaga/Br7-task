import { useState, type FormEvent } from 'react';
import { SECTORS, SECTOR_LABELS, type Sector, type StageTemplate } from '../types.js';

interface Props {
  initial?: StageTemplate;
  onClose: () => void;
  onSave: (dto: { name: string; defaultSector: Sector; defaultDurationDays: number }) => void;
}

export function StageTemplateModal({ initial, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [defaultSector, setDefaultSector] = useState<Sector>(initial?.defaultSector ?? SECTORS[0]);
  const [defaultDurationDays, setDefaultDurationDays] = useState(
    initial ? String(initial.defaultDurationDays) : '',
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, defaultSector, defaultDurationDays: Number(defaultDurationDays) });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{initial ? 'Editar etapa' : 'Nova etapa'}</h2>
        <div>
          <label htmlFor="stage-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="stage-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="stage-sector" className="block text-sm text-gray-600">
            Setor
          </label>
          <select
            id="stage-sector"
            value={defaultSector}
            onChange={(e) => setDefaultSector(e.target.value as Sector)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            {SECTORS.map((sector) => (
              <option key={sector} value={sector}>
                {SECTOR_LABELS[sector]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="stage-duration" className="block text-sm text-gray-600">
            Duração (dias)
          </label>
          <input
            id="stage-duration"
            type="number"
            min={1}
            value={defaultDurationDays}
            onChange={(e) => setDefaultDurationDays(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
