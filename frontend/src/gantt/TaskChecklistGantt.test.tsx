import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TaskChecklistGantt } from './TaskChecklistGantt.js';
import type { Task, User } from '../types.js';

const users: User[] = [{ _id: 'u1', name: 'Ana', email: 'ana@br7.com', role: 'member' }];

const tasks: Task[] = [
  {
    _id: 't1',
    name: 'Briefing',
    projectId: 'p1',
    startDate: '2026-01-01',
    endDate: '2026-01-03',
    progress: 0,
    assigneeId: 'u1',
    dependencies: [],
    status: 'todo',
  },
  {
    _id: 't2',
    name: 'Produção',
    projectId: 'p1',
    startDate: '2026-01-08',
    endDate: '2026-01-10',
    progress: 100,
    dependencies: [],
    status: 'done',
  },
];

function renderChecklist(overrides: Partial<Task[]> = tasks) {
  const onToggleDone = vi.fn();
  const onOpenTask = vi.fn();
  render(
    <TaskChecklistGantt
      tasks={overrides as Task[]}
      users={users}
      onToggleDone={onToggleDone}
      onOpenTask={onOpenTask}
    />,
  );
  return { onToggleDone, onOpenTask };
}

describe('TaskChecklistGantt', () => {
  it('shows the completed/total/percent stats', () => {
    renderChecklist();

    expect(screen.getByText('1')).toBeInTheDocument(); // concluídas
    expect(screen.getByText('2')).toBeInTheDocument(); // total
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('resolves the assignee name from the users list', () => {
    renderChecklist();
    expect(screen.getByText('Ana')).toBeInTheDocument();
  });

  it('shows a fallback when the task has no assignee', () => {
    renderChecklist();
    expect(screen.getByText('Sem responsável')).toBeInTheDocument();
  });

  it('calls onToggleDone (not onOpenTask) when the checkbox is clicked', async () => {
    const { onToggleDone, onOpenTask } = renderChecklist();

    await userEvent.click(screen.getByTestId('checkbox-t1'));

    expect(onToggleDone).toHaveBeenCalledWith(tasks[0]);
    expect(onOpenTask).not.toHaveBeenCalled();
  });

  it('calls onOpenTask when the rest of the row is clicked', async () => {
    const { onOpenTask } = renderChecklist();

    await userEvent.click(screen.getByText('Briefing'));

    expect(onOpenTask).toHaveBeenCalledWith(tasks[0]);
  });

  it('filters to only pending tasks when the "Pendentes" pill is clicked', async () => {
    renderChecklist();

    await userEvent.click(screen.getByRole('button', { name: 'Pendentes' }));

    expect(screen.getByText('Briefing')).toBeInTheDocument();
    expect(screen.queryByText('Produção')).not.toBeInTheDocument();
  });

  it('filters to only completed tasks when the "Concluídas" pill is clicked', async () => {
    renderChecklist();

    await userEvent.click(screen.getByRole('button', { name: 'Concluídas' }));

    expect(screen.queryByText('Briefing')).not.toBeInTheDocument();
    expect(screen.getByText('Produção')).toBeInTheDocument();
  });

  it('marks every week the task spans as active, and no others', () => {
    // Project range is 2026-01-01 to 2026-01-10 -> two week columns
    // (Sem 1: 01-07, Sem 2: 08-14). "Briefing" (01-03) only spans Sem 1;
    // "Produção" (08-10) only spans Sem 2.
    renderChecklist();

    const [briefingRow] = screen.getAllByText('Briefing').map((el) => el.closest('tr')!);
    const [producaoRow] = screen.getAllByText('Produção').map((el) => el.closest('tr')!);

    const briefingDots = briefingRow.querySelectorAll('td:nth-child(3), td:nth-child(4)');
    const producaoDots = producaoRow.querySelectorAll('td:nth-child(3), td:nth-child(4)');

    expect(briefingDots[0].querySelector('.bg-\\[\\#E0176A\\]')).not.toBeNull();
    expect(briefingDots[1].querySelector('.bg-\\[\\#E0176A\\]')).toBeNull();
    expect(producaoDots[0].querySelector('.bg-\\[\\#E0176A\\]')).toBeNull();
    expect(producaoDots[1].querySelector('.bg-\\[\\#E0176A\\]')).not.toBeNull();
  });

  it('does not strike through an in-progress task, and marks it done on checkbox click', async () => {
    const inProgress: Task = { ...tasks[0], _id: 't3', name: 'Revisão', status: 'in_progress' };
    const { onToggleDone } = renderChecklist([inProgress]);

    expect(screen.getByText('Revisão')).not.toHaveClass('line-through');

    await userEvent.click(screen.getByTestId('checkbox-t3'));

    expect(onToggleDone).toHaveBeenCalledWith(inProgress);
  });

  it('does not show phase group headers when no task has a phase', () => {
    renderChecklist();

    expect(screen.queryByText('Sem fase')).not.toBeInTheDocument();
  });

  it('groups tasks under their phase heading, with unphased tasks under Sem fase', () => {
    const phased: Task[] = [
      { ...tasks[0], phaseName: 'Fase I', phaseColor: '#2563EB' },
      { ...tasks[1] },
    ];
    renderChecklist(phased);

    expect(screen.getByText('Fase I')).toBeInTheDocument();
    expect(screen.getByText('Sem fase')).toBeInTheDocument();

    const briefingRow = screen.getByText('Briefing').closest('tr')!;
    const producaoRow = screen.getByText('Produção').closest('tr')!;
    const faseIHeadingRow = screen.getByText('Fase I').closest('tr')!;
    const semFaseHeadingRow = screen.getByText('Sem fase').closest('tr')!;
    const rows = Array.from(briefingRow.parentElement!.children);
    expect(rows.indexOf(faseIHeadingRow)).toBeLessThan(rows.indexOf(briefingRow));
    expect(rows.indexOf(semFaseHeadingRow)).toBeLessThan(rows.indexOf(producaoRow));
    expect(rows.indexOf(briefingRow)).toBeLessThan(rows.indexOf(semFaseHeadingRow));
  });
});
