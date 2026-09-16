import { apiClient } from './client.js';
import type { Phase } from '../types.js';

export function listPhases(serviceTypeId: string) {
  return apiClient
    .get<Phase[]>(`/service-types/${serviceTypeId}/phases`)
    .then((res) => res.data);
}

export function createPhase(
  serviceTypeId: string,
  dto: { name: string; color: string; startDay: number; endDay: number },
) {
  return apiClient
    .post<Phase>(`/service-types/${serviceTypeId}/phases`, dto)
    .then((res) => res.data);
}

export function updatePhase(
  id: string,
  dto: { name?: string; color?: string; startDay?: number; endDay?: number; active?: boolean },
) {
  return apiClient.patch<Phase>(`/phases/${id}`, dto).then((res) => res.data);
}

export function deletePhase(id: string) {
  return apiClient.delete(`/phases/${id}`);
}

export function reorderPhases(serviceTypeId: string, orderedIds: string[]) {
  return apiClient
    .put<Phase[]>(`/service-types/${serviceTypeId}/phases/reorder`, { orderedIds })
    .then((res) => res.data);
}
