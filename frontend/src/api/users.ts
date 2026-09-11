import { apiClient } from './client.js';
import type { Role, User } from '../types.js';

export function listUsers() {
  return apiClient.get<User[]>('/users').then((res) => res.data);
}

export interface CreateUserDto {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export function createUser(dto: CreateUserDto) {
  return apiClient.post<User>('/users', dto).then((res) => res.data);
}
