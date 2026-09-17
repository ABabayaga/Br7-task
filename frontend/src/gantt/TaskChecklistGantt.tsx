import { Fragment, useState } from 'react';
import { computeWeekColumns, isTaskActiveInWeek } from './computeWeekColumns.js';
import type { Task, TaskStatus, User } from '../types.js';

interface Props {
  tasks: Task[];
  users: User[];
  onToggleDone: (task: Task) => void;
  onOpenTask: (task: Task) => void;
}

type Filter = 'all' | TaskStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'todo', label: 'Pendentes' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'done', label: 'Concluídas' },
];

export function TaskChecklistGantt({ tasks, users, onToggleDone, onOpenTask }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const done = tasks.filter((t) => t.status === 'done').length;
  const total = tasks.length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const weeks = computeWeekColumns(tasks);
  const visibleTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);
  const hasPhases = tasks.some((t) => t.phaseName);
  const columnCount = 2 + weeks.length;

  function assigneeName(task: Task): string {
    if (!task.assigneeId) return 'Sem responsável';
    return users.find((u) => u._id === task.assigneeId)?.name ?? 'Sem responsável';
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-4">
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-center">
          <div className="text-2xl font-semibold text-[#E0176A]">{done}</div>
          <div className="text-xs text-gray-500">concluídas</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-center">
          <div className="text-2xl font-semibold text-gray-500">{total}</div>
          <div className="text-xs text-gray-500">total</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-3 text-center">
          <div className="text-2xl font-semibold text-green-600">{pct}%</div>
          <div className="text-xs text-gray-500">progresso</div>
        </div>
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full border border-gray-200 bg-gray-100">
        <div
          className="h-full rounded-full bg-linear-to-r from-[#E0176A] to-[#FF5A36] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'border-[#E0176A] bg-pink-50 text-[#E0176A]'
                : 'border-gray-300 text-gray-600 hover:border-[#E0176A] hover:text-[#E0176A]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="min-w-[220px] border-b border-gray-100 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500">
                Tarefa
              </th>
              <th className="min-w-[120px] border-b border-gray-100 bg-gray-50 px-3 py-2 text-left font-medium text-gray-500">
                Responsável
              </th>
              {weeks.map((week) => (
                <th
                  key={week.label}
                  className="w-14 border-b border-gray-100 bg-gray-50 px-2 py-2 text-center font-medium text-gray-500"
                >
                  {week.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((task, index) => {
              const isDone = task.status === 'done';
              const currentPhaseLabel = task.phaseName ?? 'Sem fase';
              const previousPhaseLabel =
                index > 0 ? (visibleTasks[index - 1].phaseName ?? 'Sem fase') : null;
              const showPhaseHeader = hasPhases && currentPhaseLabel !== previousPhaseLabel;
              return (
                <Fragment key={task._id}>
                  {showPhaseHeader && (
                    <tr>
                      <td
                        colSpan={columnCount}
                        className="bg-gray-50 px-3 py-2 text-xs font-semibold uppercase text-gray-500"
                      >
                        <span className="flex items-center gap-2">
                          {task.phaseColor && (
                            <span
                              className="h-3 w-3 rounded"
                              style={{ backgroundColor: task.phaseColor }}
                              aria-hidden="true"
                            />
                          )}
                          {currentPhaseLabel}
                        </span>
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => onOpenTask(task)}
                    className={`cursor-pointer border-b border-gray-50 hover:bg-pink-50/40 ${isDone ? 'opacity-60' : ''}`}
                  >
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          role="checkbox"
                          aria-checked={isDone}
                          data-testid={`checkbox-${task._id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleDone(task);
                          }}
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                            isDone ? 'border-[#E0176A] bg-[#E0176A]' : 'border-gray-300'
                          }`}
                        >
                          {isDone && <span className="text-[10px] leading-none text-white">✓</span>}
                        </div>
                        <span className={isDone ? 'text-gray-400 line-through' : 'text-gray-800'}>
                          {task.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500 italic">{assigneeName(task)}</td>
                    {weeks.map((week) => (
                      <td key={week.label} className="text-center">
                        {isTaskActiveInWeek(task, week) ? (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full bg-[#E0176A]" />
                        ) : (
                          <span className="mx-auto inline-block h-2.5 w-2.5 rounded-full border border-gray-200" />
                        )}
                      </td>
                    ))}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
