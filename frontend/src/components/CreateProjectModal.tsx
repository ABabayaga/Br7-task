import { useState, type FormEvent } from 'react';
import type { Client, ServiceType } from '../types.js';

interface Props {
  clients: Client[];
  serviceTypes: ServiceType[];
  onClose: () => void;
  onCreate: (dto: {
    name: string;
    description?: string;
    clientId: string;
    serviceTypeId: string;
    startDate: string;
  }) => void;
}

export function CreateProjectModal({ clients, serviceTypes, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(clients[0]?._id ?? '');
  const [serviceTypeId, setServiceTypeId] = useState(serviceTypes[0]?._id ?? '');
  const [startDate, setStartDate] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      name,
      description: description || undefined,
      clientId,
      serviceTypeId,
      startDate,
    });
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40">
      <form onSubmit={handleSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-lg font-semibold">Novo projeto</h2>
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
          <label htmlFor="description" className="block text-sm text-gray-600">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="client" className="block text-sm text-gray-600">
            Cliente
          </label>
          <select
            id="client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          >
            {clients.map((client) => (
              <option key={client._id} value={client._id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="service-type" className="block text-sm text-gray-600">
            Tipo de serviço
          </label>
          <select
            id="service-type"
            value={serviceTypeId}
            onChange={(e) => setServiceTypeId(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          >
            {serviceTypes.map((serviceType) => (
              <option key={serviceType._id} value={serviceType._id}>
                {serviceType.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="start-date" className="block text-sm text-gray-600">
            Data de início
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-gray-600">
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
