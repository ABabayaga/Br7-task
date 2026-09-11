import { wouldCreateCycle } from './dependency-cycle.util.js';

describe('wouldCreateCycle', () => {
  it('returns false when there is no cycle', () => {
    const allTasks = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
    ];
    expect(wouldCreateCycle('b', ['a'], allTasks)).toBe(false);
  });

  it('returns true for a direct self-dependency', () => {
    const allTasks = [{ id: 'a', dependencies: [] }];
    expect(wouldCreateCycle('a', ['a'], allTasks)).toBe(true);
  });

  it('returns true for a transitive cycle (a -> b -> c -> a)', () => {
    const allTasks = [
      { id: 'a', dependencies: [] },
      { id: 'b', dependencies: ['a'] },
      { id: 'c', dependencies: ['b'] },
    ];
    // Proposing that 'a' depends on 'c' closes the loop a -> c -> b -> a.
    expect(wouldCreateCycle('a', ['c'], allTasks)).toBe(true);
  });
});
