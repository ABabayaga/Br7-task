import type { Role } from '../types.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

/**
 * Decodes a JWT's payload without verifying its signature. Intended only for
 * UI concerns (e.g. deciding whether to show an admin-only nav item) — the
 * backend remains the source of truth and re-validates every request.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
