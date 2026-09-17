import { useState, type FormEvent } from 'react';
import { getWeekOptions, toDateInputValue, type TaskDateRange } from '../gantt/computeWeekColumns.js';

interface Props {
  tasks: TaskDateRange[];
  onClose: () => void;
  onCreate: (dto: { name: string; startDate: string; endDate: string }) => void;
}

export function CreateTaskModal({ tasks, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const weekOptions = getWeekOptions(tasks, new Date());

  function applyWeek(e: React.ChangeEvent<HTMLSelectElement>) {
    const week = weekOptions[Number(e.target.value)];
    if (!week) return;
    setStartDate(toDateInputValue(week.start));
    setEndDate(toDateInputValue(week.end));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name, startDate, endDate });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Nova tarefa</h2>
        <div>
          <label htmlFor="task-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="task-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="week" className="block text-sm text-gray-600">
            Semana
          </label>
          <select
            id="week"
            defaultValue=""
            onChange={applyWeek}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="" disabled>
              Selecione uma semana
            </option>
            {weekOptions.map((week, index) => (
              <option key={week.label} value={index}>
                {week.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-sm text-gray-600">
              Início
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="end-date" className="block text-sm text-gray-600">
              Fim
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button type="submit" className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]">
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
