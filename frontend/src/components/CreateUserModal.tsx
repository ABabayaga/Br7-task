import { useState, type FormEvent } from 'react';
import type { Role } from '../types.js';

interface Props {
  onClose: () => void;
  onCreate: (dto: { name: string; email: string; password: string; role: Role }) => void;
}

export function CreateUserModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({ name, email, password, role });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo usuário</h2>
        <div>
          <label htmlFor="name" className="block text-sm text-gray-600">
            Nome
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm text-gray-600">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm text-gray-600">
            Senha
          </label>
          <input
            id="password"
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm text-gray-600">
            Papel
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white">
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
