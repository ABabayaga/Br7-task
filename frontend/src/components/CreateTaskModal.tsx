import { useState, type FormEvent } from 'react';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string; startDate: string; endDate: string }) => void;
}

export function CreateTaskModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
