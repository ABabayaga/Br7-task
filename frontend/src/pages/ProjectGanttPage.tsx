import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { listTasks, createTask, updateTask, deleteTask } from '../api/tasks.js';
import { listUsers } from '../api/users.js';
import { TaskChecklistGantt } from '../gantt/TaskChecklistGantt.js';
import { CreateTaskModal } from '../components/CreateTaskModal.js';
import { TaskEditModal } from '../components/TaskEditModal.js';
import type { Task, User } from '../types.js';

export function ProjectGanttPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedTask = tasks.find((t) => t._id === selectedTaskId) ?? null;

  function refresh() {
    if (!projectId) return;
    listTasks(projectId).then(setTasks);
  }

  useEffect(refresh, [projectId]);
  useEffect(() => {
    listUsers().then(setUsers);
  }, []);

  async function handleToggleDone(task: Task) {
    setError(null);
    try {
      // The checklist checkbox is binary: checking it marks any non-done
      // task (todo or in_progress) as done; unchecking always reverts to
      // todo. There's no round trip back to in_progress via the checkbox —
      // that still requires the edit modal.
      await updateTask(task._id, { status: task.status === 'done' ? 'todo' : 'done' });
      refresh();
    } catch {
      setError('Não foi possível atualizar o status.');
      refresh();
    }
  }

  async function handleCreate(dto: { name: string; startDate: string; endDate: string }) {
    if (!projectId) return;
    await createTask(projectId, dto);
    setShowCreateModal(false);
    refresh();
  }

  async function handleTaskSave(dto: Partial<Omit<Task, '_id' | 'projectId'>>) {
    if (!selectedTaskId) return;
    setError(null);
    try {
      await updateTask(selectedTaskId, dto);
      setSelectedTaskId(null);
      refresh();
    } catch {
      setError('Não foi possível salvar a tarefa (verifique se não criou um ciclo de dependência).');
    }
  }

  async function handleTaskDelete(id: string) {
    await deleteTask(id);
    setSelectedTaskId(null);
    refresh();
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Gantt do projeto</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Adicionar tarefa
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {tasks.length > 0 ? (
        <TaskChecklistGantt
          tasks={tasks}
          users={users}
          onToggleDone={handleToggleDone}
          onOpenTask={(task) => setSelectedTaskId(task._id)}
        />
      ) : (
        <p className="text-gray-500">Nenhuma tarefa ainda.</p>
      )}

      {showCreateModal && (
        <CreateTaskModal
          tasks={tasks}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}

      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          otherTasks={tasks.filter((t) => t._id !== selectedTask._id)}
          onClose={() => setSelectedTaskId(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}
    </div>
  );
}
