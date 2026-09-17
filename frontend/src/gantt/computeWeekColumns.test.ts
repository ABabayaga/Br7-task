import { describe, it, expect } from 'vitest';
import {
  computeWeekColumns,
  isTaskActiveInWeek,
  getWeekOptions,
  toDateInputValue,
} from './computeWeekColumns.js';

describe('computeWeekColumns', () => {
  it('returns no columns when there are no tasks', () => {
    expect(computeWeekColumns([])).toEqual([]);
  });

  it('returns one column when all tasks fit within 7 days', () => {
    const tasks = [{ startDate: '2026-01-01', endDate: '2026-01-05' }];

    const weeks = computeWeekColumns(tasks);

    expect(weeks).toEqual([
      { label: 'Sem 1', start: new Date('2026-01-01'), end: new Date('2026-01-07') },
    ]);
  });

  it('splits a 10-day span into two consecutive week columns', () => {
    const tasks = [{ startDate: '2026-01-01', endDate: '2026-01-10' }];

    const weeks = computeWeekColumns(tasks);

    expect(weeks).toEqual([
      { label: 'Sem 1', start: new Date('2026-01-01'), end: new Date('2026-01-07') },
      { label: 'Sem 2', start: new Date('2026-01-08'), end: new Date('2026-01-14') },
    ]);
  });

  it('starts the first week at the earliest task start date across tasks', () => {
    const tasks = [
      { startDate: '2026-01-03', endDate: '2026-01-04' },
      { startDate: '2026-01-01', endDate: '2026-01-02' },
    ];

    const weeks = computeWeekColumns(tasks);

    expect(weeks[0].start).toEqual(new Date('2026-01-01'));
  });
});

describe('isTaskActiveInWeek', () => {
  const week = { label: 'Sem 1', start: new Date('2026-01-01'), end: new Date('2026-01-07') };

  it('is true when the task range overlaps the week', () => {
    const task = { startDate: '2026-01-05', endDate: '2026-01-10' };
    expect(isTaskActiveInWeek(task, week)).toBe(true);
  });

  it('is false when the task ends before the week starts', () => {
    const task = { startDate: '2025-12-20', endDate: '2025-12-31' };
    expect(isTaskActiveInWeek(task, week)).toBe(false);
  });

  it('is false when the task starts after the week ends', () => {
    const task = { startDate: '2026-01-08', endDate: '2026-01-12' };
    expect(isTaskActiveInWeek(task, week)).toBe(false);
  });

  it('is true when the task ends exactly on the week start (inclusive boundary)', () => {
    const task = { startDate: '2025-12-28', endDate: '2026-01-01' };
    expect(isTaskActiveInWeek(task, week)).toBe(true);
  });

  it('is true when the task starts exactly on the week end (inclusive boundary)', () => {
    const task = { startDate: '2026-01-07', endDate: '2026-01-09' };
    expect(isTaskActiveInWeek(task, week)).toBe(true);
  });
});

describe('getWeekOptions', () => {
  it('falls back to a single week starting at fallbackStart when there are no tasks', () => {
    const options = getWeekOptions([], new Date('2026-01-01'));

    expect(options).toEqual([
      { label: 'Sem 1', start: new Date('2026-01-01'), end: new Date('2026-01-07') },
    ]);
  });

  it('appends one trailing week after the tasks-derived range', () => {
    const tasks = [{ startDate: '2026-01-01', endDate: '2026-01-05' }];

    const options = getWeekOptions(tasks, new Date('2026-01-01'));

    expect(options).toEqual([
      { label: 'Sem 1', start: new Date('2026-01-01'), end: new Date('2026-01-07') },
      { label: 'Sem 2', start: new Date('2026-01-08'), end: new Date('2026-01-14') },
    ]);
  });
});

describe('toDateInputValue', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toDateInputValue(new Date('2026-01-08'))).toBe('2026-01-08');
  });
});
