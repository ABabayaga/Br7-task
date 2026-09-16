import { apiClient } from './client.js';
import type { Sector, StageTemplate } from '../types.js';

export function listStageTemplates(serviceTypeId: string) {
  return apiClient
    .get<StageTemplate[]>(`/service-types/${serviceTypeId}/stage-templates`)
    .then((res) => res.data);
}

export function createStageTemplate(
  serviceTypeId: string,
  dto: { name: string; defaultSector: Sector; defaultDurationDays: number; phaseId?: string },
) {
  return apiClient
    .post<StageTemplate>(`/service-types/${serviceTypeId}/stage-templates`, dto)
    .then((res) => res.data);
}

export function updateStageTemplate(
  id: string,
  dto: {
    name?: string;
    defaultSector?: Sector;
    defaultDurationDays?: number;
    phaseId?: string | null;
    active?: boolean;
  },
) {
  return apiClient.patch<StageTemplate>(`/stage-templates/${id}`, dto).then((res) => res.data);
}

export function deleteStageTemplate(id: string) {
  return apiClient.delete(`/stage-templates/${id}`);
}

export function reorderStageTemplates(serviceTypeId: string, orderedIds: string[]) {
  return apiClient
    .put<StageTemplate[]>(`/service-types/${serviceTypeId}/stage-templates/reorder`, {
      orderedIds,
    })
    .then((res) => res.data);
}
