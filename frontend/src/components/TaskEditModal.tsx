import { useEffect, useState, type FormEvent } from 'react';
import { listUsers } from '../api/users.js';
import { getWeekOptions, toDateInputValue } from '../gantt/computeWeekColumns.js';
import type { Task, TaskStatus, User } from '../types.js';

interface Props {
  task: Task;
  otherTasks: Task[];
  onClose: () => void;
  onSave: (dto: Partial<Omit<Task, '_id' | 'projectId'>>) => void;
  onDelete: (id: string) => void;
}

export function TaskEditModal({ task, otherTasks, onClose, onSave, onDelete }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState(task.name);
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? '');
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [dependencies, setDependencies] = useState<string[]>(task.dependencies);
  const [startDate, setStartDate] = useState(task.startDate);
  const [endDate, setEndDate] = useState(task.endDate);

  const weekOptions = getWeekOptions([...otherTasks, task], new Date(task.startDate));

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  function toggleDependency(id: string) {
    setDependencies((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function applyWeek(e: React.ChangeEvent<HTMLSelectElement>) {
    const week = weekOptions[Number(e.target.value)];
    if (!week) return;
    const durationMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    setStartDate(toDateInputValue(week.start));
    setEndDate(toDateInputValue(new Date(week.start.getTime() + durationMs)));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, assigneeId: assigneeId || undefined, status, dependencies, startDate, endDate });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Editar tarefa</h2>

        <div>
          <label htmlFor="edit-name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="week" className="block text-sm text-gray-600">
              Semana
            </label>
            <select
              id="week"
              value={weekOptions.findIndex(
                (week) => toDateInputValue(week.start) === startDate,
              )}
              onChange={applyWeek}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              {weekOptions.map((week, index) => (
                <option key={week.label} value={index}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="edit-start-date" className="block text-sm text-gray-600">
              Início
            </label>
            <input
              id="edit-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
          <div className="flex-1">
            <label htmlFor="edit-end-date" className="block text-sm text-gray-600">
              Fim
            </label>
            <input
              id="edit-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="assignee" className="block text-sm text-gray-600">
            Responsável
          </label>
          <select
            id="assignee"
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="">Sem responsável</option>
            {users.map((user) => (
              <option key={user._id} value={user._id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm text-gray-600">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="todo">A fazer</option>
            <option value="in_progress">Em andamento</option>
            <option value="done">Concluída</option>
          </select>
        </div>

        <fieldset>
          <legend className="block text-sm text-gray-600">Predecessoras</legend>
          <div className="mt-1 max-h-32 space-y-1 overflow-y-auto">
            {otherTasks.map((other) => (
              <label key={other._id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={dependencies.includes(other._id)}
                  onChange={() => toggleDependency(other._id)}
                  className="rounded border-gray-300 text-[#E0176A] focus:ring-[#E0176A]"
                />
                {other.name}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => onDelete(task._id)}
            className="rounded px-4 py-2 text-red-600 hover:bg-red-50"
          >
            Excluir
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
              Cancelar
            </button>
            <button type="submit" className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]">
              Salvar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
