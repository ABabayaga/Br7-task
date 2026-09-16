import { useState, type FormEvent } from 'react';
import type { Phase } from '../types.js';

interface Props {
  initial?: Phase;
  onClose: () => void;
  onSave: (dto: { name: string; color: string; startDay: number; endDay: number }) => void;
}

export function PhaseModal({ initial, onClose, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? '#2563EB');
  const [startDay, setStartDay] = useState(initial ? String(initial.startDay) : '');
  const [endDay, setEndDay] = useState(initial ? String(initial.endDay) : '');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, color, startDay: Number(startDay), endDay: Number(endDay) });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{initial ? 'Editar fase' : 'Nova fase'}</h2>
        <div>
          <label htmlFor="phase-name" className="block text-sm text-gray-600">
            Nome da fase
          </label>
          <input
            id="phase-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="phase-color" className="block text-sm text-gray-600">
            Cor
          </label>
          <input
            id="phase-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1 h-10 w-16 rounded border border-gray-300"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="phase-start-day" className="block text-sm text-gray-600">
              Dia inicial
            </label>
            <input
              id="phase-start-day"
              type="number"
              min={1}
              value={startDay}
              onChange={(e) => setStartDay(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="phase-end-day" className="block text-sm text-gray-600">
              Dia final
            </label>
            <input
              id="phase-end-day"
              type="number"
              min={1}
              value={endDay}
              onChange={(e) => setEndDay(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Salvar fase
          </button>
        </div>
      </form>
    </div>
  );
}
