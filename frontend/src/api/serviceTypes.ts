import { apiClient } from './client.js';
import type { ServiceType } from '../types.js';

export function listServiceTypes() {
  return apiClient.get<ServiceType[]>('/service-types').then((res) => res.data);
}

export function createServiceType(dto: { name: string }) {
  return apiClient.post<ServiceType>('/service-types', dto).then((res) => res.data);
}

export function updateServiceType(id: string, dto: { name?: string; active?: boolean }) {
  return apiClient.patch<ServiceType>(`/service-types/${id}`, dto).then((res) => res.data);
}
