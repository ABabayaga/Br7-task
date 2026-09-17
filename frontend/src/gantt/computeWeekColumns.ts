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
