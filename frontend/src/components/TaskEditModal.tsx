import { useEffect, useState, type FormEvent } from 'react';
import { listUsers } from '../api/users.js';
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

  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  function toggleDependency(id: string) {
    setDependencies((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id],
    );
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSave({ name, assigneeId: assigneeId || undefined, status, dependencies });
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
            <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
              Salvar
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
