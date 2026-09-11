import { createContext, useContext, useState, type ReactNode } from 'react';
import { login as loginRequest } from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';
import { decodeJwtPayload } from './jwt.js';
import type { Role } from '../types.js';

interface AuthContextValue {
  token: string | null;
  role: Role | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function roleFromToken(token: string | null): Role | null {
  return token ? (decodeJwtPayload(token)?.role ?? null) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [role, setRole] = useState<Role | null>(() => roleFromToken(token));

  async function login(email: string, password: string) {
    const accessToken = await loginRequest(email, password);
    localStorage.setItem(TOKEN_KEY, accessToken);
    setToken(accessToken);
    setRole(roleFromToken(accessToken));
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRole(null);
  }

  return (
    <AuthContext.Provider value={{ token, role, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
