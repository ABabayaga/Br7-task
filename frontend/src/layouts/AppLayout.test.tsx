import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { AppLayout } from './AppLayout.js';
import { AuthProvider } from '../auth/AuthContext.js';
import * as authContext from '../auth/AuthContext.js';

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<div>Home content</div>} />
            <Route path="/projetos" element={<div>Projetos content</div>} />
            <Route path="/usuarios" element={<div>Usuarios content</div>} />
          </Route>
          <Route path="/login" element={<div>Login content</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AppLayout', () => {
  it('renders Home and Projetos nav items and the current page content', () => {
    renderLayout();

    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /projetos/i })).toBeInTheDocument();
    expect(screen.getByText('Home content')).toBeInTheDocument();
  });

  it('logs out and navigates to /login when the logout button is clicked', async () => {
    const logout = vi.fn();
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      token: 'fake-jwt',
      role: null,
      login: vi.fn(),
      logout,
    });

    renderLayout();

    await userEvent.click(screen.getByRole('button', { name: /sair/i }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByText('Login content')).toBeInTheDocument();
  });

  it('shows the Usuários nav item only for admins', () => {
    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      token: 'fake-jwt',
      role: 'member',
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { unmount } = renderLayout();
    expect(screen.queryByRole('link', { name: /usuários/i })).not.toBeInTheDocument();
    unmount();

    vi.spyOn(authContext, 'useAuth').mockReturnValue({
      token: 'fake-jwt',
      role: 'admin',
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderLayout();
    expect(screen.getByRole('link', { name: /usuários/i })).toBeInTheDocument();
  });
});
