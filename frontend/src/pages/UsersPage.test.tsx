import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { UsersPage } from './UsersPage.js';
import * as usersApi from '../api/users.js';
import type { User } from '../types.js';

const users: User[] = [{ _id: 'u1', name: 'Alice', email: 'alice@br7.com', role: 'admin' }];

describe('UsersPage', () => {
  it('lists existing users', async () => {
    vi.spyOn(usersApi, 'listUsers').mockResolvedValue(users);

    render(<UsersPage />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@br7.com')).toBeInTheDocument();
  });

  it('creates a user via the modal and refreshes the list', async () => {
    vi.spyOn(usersApi, 'listUsers')
      .mockResolvedValueOnce(users)
      .mockResolvedValueOnce([
        ...users,
        { _id: 'u2', name: 'Bob', email: 'bob@br7.com', role: 'member' },
      ]);
    vi.spyOn(usersApi, 'createUser').mockResolvedValue({
      _id: 'u2',
      name: 'Bob',
      email: 'bob@br7.com',
      role: 'member',
    });

    render(<UsersPage />);
    await screen.findByText('Alice');

    await userEvent.click(screen.getByRole('button', { name: /novo usuário/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@br7.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    await waitFor(() =>
      expect(usersApi.createUser).toHaveBeenCalledWith({
        name: 'Bob',
        email: 'bob@br7.com',
        password: 'password123',
        role: 'member',
      }),
    );
    expect(await screen.findByText('Bob')).toBeInTheDocument();
  });

  it('shows an error message when creation fails', async () => {
    vi.spyOn(usersApi, 'listUsers').mockResolvedValue(users);
    vi.spyOn(usersApi, 'createUser').mockRejectedValue(new Error('forbidden'));

    render(<UsersPage />);
    await screen.findByText('Alice');

    await userEvent.click(screen.getByRole('button', { name: /novo usuário/i }));
    await userEvent.type(screen.getByLabelText(/nome/i), 'Bob');
    await userEvent.type(screen.getByLabelText(/email/i), 'bob@br7.com');
    await userEvent.type(screen.getByLabelText(/senha/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^criar$/i }));

    expect(await screen.findByText(/não foi possível criar o usuário/i)).toBeInTheDocument();
  });
});
