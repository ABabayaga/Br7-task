import { apiClient } from './client.js';
import type { Client } from '../types.js';

export function listClients() {
  return apiClient.get<Client[]>('/clients').then((res) => res.data);
}

export function createClient(dto: { name: string }) {
  return apiClient.post<Client>('/clients', dto).then((res) => res.data);
}

export function updateClient(id: string, dto: { name?: string; active?: boolean }) {
  return apiClient.patch<Client>(`/clients/${id}`, dto).then((res) => res.data);
}

export function getClientOverride(clientId: string, serviceTypeId: string) {
  return apiClient
    .get<{ disabledStageTemplateIds: string[] }>(`/clients/${clientId}/overrides/${serviceTypeId}`)
    .then((res) => res.data.disabledStageTemplateIds);
}

export function setClientOverride(
  clientId: string,
  serviceTypeId: string,
  disabledStageTemplateIds: string[],
) {
  return apiClient
    .put(`/clients/${clientId}/overrides/${serviceTypeId}`, { disabledStageTemplateIds })
    .then((res) => res.data);
}
