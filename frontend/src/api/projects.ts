import { apiClient } from './client.js';
import type { Project } from '../types.js';

export function listProjects() {
  return apiClient.get<Project[]>('/projects').then((res) => res.data);
}

export function createProject(dto: { name: string; description?: string }) {
  return apiClient.post<Project>('/projects', dto).then((res) => res.data);
}

export function archiveProject(id: string) {
  return apiClient.patch<Project>(`/projects/${id}`, { status: 'archived' }).then((res) => res.data);
}
