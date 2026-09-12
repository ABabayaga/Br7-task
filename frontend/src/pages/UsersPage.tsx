import { useEffect, useState } from 'react';
import { listUsers, createUser } from '../api/users.js';
import { CreateUserModal } from '../components/CreateUserModal.js';
import type { User } from '../types.js';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listUsers().then(setUsers);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string; email: string; password: string; role: 'admin' | 'member' }) {
    setError(null);
    try {
      await createUser(dto);
      setShowModal(false);
      refresh();
    } catch {
      setError('Não foi possível criar o usuário.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Usuários</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo usuário
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {users.map((user) => (
          <li
            key={user._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div>
              <p className="font-medium text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <span className="text-xs uppercase text-gray-500">{user.role}</span>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateUserModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
