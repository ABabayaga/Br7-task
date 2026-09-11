import { apiClient } from './client.js';
import type { Task } from '../types.js';

export function listTasks(projectId: string) {
  return apiClient.get<Task[]>(`/projects/${projectId}/tasks`).then((res) => res.data);
}

export function createTask(
  projectId: string,
  dto: { name: string; startDate: string; endDate: string; assigneeId?: string },
) {
  return apiClient.post<Task>(`/projects/${projectId}/tasks`, dto).then((res) => res.data);
}

export function updateTask(id: string, dto: Partial<Omit<Task, '_id' | 'projectId'>>) {
  return apiClient.patch<Task>(`/tasks/${id}`, dto).then((res) => res.data);
}

export function deleteTask(id: string) {
  return apiClient.delete(`/tasks/${id}`);
}
