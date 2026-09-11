import type { Task as GanttTask } from 'gantt-task-react';
import type { Task } from '../types.js';

export function mapTasksToGanttFormat(tasks: Task[]): GanttTask[] {
  return tasks.map((task) => ({
    id: task._id,
    name: task.name,
    type: 'task',
    start: new Date(task.startDate),
    end: new Date(task.endDate),
    progress: task.progress,
    dependencies: task.dependencies,
    project: task.projectId,
  }));
}
