import { describe, it, expect } from 'vitest';
import { decodeJwtPayload } from './jwt.js';

function encode(payload: object) {
  const base64Url = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${base64Url}.signature`;
}

describe('decodeJwtPayload', () => {
  it('decodes a valid JWT payload', () => {
    const token = encode({ sub: '1', email: 'a@b.com', role: 'admin' });
    expect(decodeJwtPayload(token)).toEqual({ sub: '1', email: 'a@b.com', role: 'admin' });
  });

  it('returns null for a malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
    expect(decodeJwtPayload('')).toBeNull();
  });
});
