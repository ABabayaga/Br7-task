import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext.js';
import * as authApi from '../api/auth.js';
import { TOKEN_KEY } from '../api/client.js';

function Probe() {
  const { token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="token">{token ?? 'none'}</span>
      <button onClick={() => login('a@b.com', 'pw')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores the token on login and clears it on logout', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue('fake-jwt');
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('token')).toHaveTextContent('fake-jwt'));
    expect(localStorage.getItem(TOKEN_KEY)).toBe('fake-jwt');

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('token')).toHaveTextContent('none');
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});
