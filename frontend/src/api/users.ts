import { apiClient } from './client.js';
import type { User } from '../types.js';

export function listUsers() {
  return apiClient.get<User[]>('/users').then((res) => res.data);
}
