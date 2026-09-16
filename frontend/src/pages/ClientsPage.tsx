import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listClients, createClient, updateClient } from '../api/clients.js';
import { CreateClientModal } from '../components/CreateClientModal.js';
import type { Client } from '../types.js';

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listClients().then(setClients);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string }) {
    await createClient(dto);
    setShowModal(false);
    refresh();
  }

  async function handleToggleActive(client: Client) {
    await updateClient(client._id, { active: !client.active });
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo cliente
        </button>
      </div>

      <ul className="space-y-3">
        {clients.map((client) => (
          <li
            key={client._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link to={`/clientes/${client._id}`} className="font-medium text-[#E0176A] hover:underline">
              {client.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">
                {client.active ? 'ativo' : 'inativo'}
              </span>
              <button
                onClick={() => handleToggleActive(client)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {client.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showModal && <CreateClientModal onClose={() => setShowModal(false)} onCreate={handleCreate} />}
    </div>
  );
}
