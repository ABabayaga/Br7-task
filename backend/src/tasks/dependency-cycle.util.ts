export interface TaskNode {
  id: string;
  dependencies: string[];
}

/**
 * Given the proposed new `dependencies` list for `taskId`, returns true if
 * applying it would create a cycle anywhere reachable from `taskId` in the
 * project's dependency graph.
 */
export function wouldCreateCycle(
  taskId: string,
  newDependencies: string[],
  allTasks: TaskNode[],
): boolean {
  const graph = new Map<string, string[]>();
  for (const task of allTasks) {
    graph.set(task.id, task.id === taskId ? newDependencies : task.dependencies);
  }
  if (!graph.has(taskId)) {
    graph.set(taskId, newDependencies);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function hasCycle(node: string): boolean {
    if (visited.has(node)) return false;
    if (visiting.has(node)) return true;

    visiting.add(node);
    for (const dep of graph.get(node) ?? []) {
      if (hasCycle(dep)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return hasCycle(taskId);
}
