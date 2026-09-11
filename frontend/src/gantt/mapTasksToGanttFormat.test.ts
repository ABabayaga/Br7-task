import { describe, it, expect } from 'vitest';
import { mapTasksToGanttFormat } from './mapTasksToGanttFormat.js';
import type { Task } from '../types.js';

describe('mapTasksToGanttFormat', () => {
  it('maps backend tasks to gantt-task-react shape', () => {
    const tasks: Task[] = [
      {
        _id: 'a',
        name: 'Briefing',
        projectId: 'p1',
        startDate: '2026-01-01',
        endDate: '2026-01-05',
        progress: 50,
        dependencies: [],
        status: 'in_progress',
      },
      {
        _id: 'b',
        name: 'Produção',
        projectId: 'p1',
        startDate: '2026-01-06',
        endDate: '2026-01-10',
        progress: 0,
        dependencies: ['a'],
        status: 'todo',
      },
    ];

    const result = mapTasksToGanttFormat(tasks);

    expect(result).toEqual([
      {
        id: 'a',
        name: 'Briefing',
        type: 'task',
        start: new Date('2026-01-01'),
        end: new Date('2026-01-05'),
        progress: 50,
        dependencies: [],
        project: 'p1',
      },
      {
        id: 'b',
        name: 'Produção',
        type: 'task',
        start: new Date('2026-01-06'),
        end: new Date('2026-01-10'),
        progress: 0,
        dependencies: ['a'],
        project: 'p1',
      },
    ]);
  });

  it('returns an empty array for an empty task list', () => {
    expect(mapTasksToGanttFormat([])).toEqual([]);
  });
});
