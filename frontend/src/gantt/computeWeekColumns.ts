const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export interface WeekColumn {
  label: string;
  start: Date;
  end: Date;
}

export interface TaskDateRange {
  startDate: string;
  endDate: string;
}

export function computeWeekColumns(tasks: TaskDateRange[]): WeekColumn[] {
  if (tasks.length === 0) return [];

  const rangeStart = new Date(Math.min(...tasks.map((t) => new Date(t.startDate).getTime())));
  const rangeEnd = new Date(Math.max(...tasks.map((t) => new Date(t.endDate).getTime())));

  const weeks: WeekColumn[] = [];
  let weekStart = rangeStart;
  let index = 1;
  while (weekStart <= rangeEnd) {
    const weekEnd = new Date(weekStart.getTime() + WEEK_MS - DAY_MS);
    weeks.push({ label: `Sem ${index}`, start: weekStart, end: weekEnd });
    weekStart = new Date(weekStart.getTime() + WEEK_MS);
    index++;
  }
  return weeks;
}

export function isTaskActiveInWeek(task: TaskDateRange, week: WeekColumn): boolean {
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);
  return taskStart <= week.end && taskEnd >= week.start;
}

// Week choices for a "Semana" picker: the project's current week columns
// (derived from `tasks`) plus one trailing week so users can push a task
// past the range instead of only choosing among existing weeks. Falls back
// to a single week starting at `fallbackStart` (e.g. "today") when there
// are no tasks yet to derive a range from.
export function getWeekOptions(tasks: TaskDateRange[], fallbackStart: Date): WeekColumn[] {
  const weeks = computeWeekColumns(tasks);
  if (weeks.length === 0) {
    return [{ label: 'Sem 1', start: fallbackStart, end: new Date(fallbackStart.getTime() + WEEK_MS - DAY_MS) }];
  }

  const last = weeks[weeks.length - 1];
  const nextStart = new Date(last.start.getTime() + WEEK_MS);
  const nextEnd = new Date(nextStart.getTime() + WEEK_MS - DAY_MS);
  return [...weeks, { label: `Sem ${weeks.length + 1}`, start: nextStart, end: nextEnd }];
}

export function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
