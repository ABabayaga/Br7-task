import { apiClient } from './client.js';

export function login(email: string, password: string) {
  return apiClient
    .post<{ accessToken: string }>('/auth/login', { email, password })
    .then((res) => res.data.accessToken);
}
