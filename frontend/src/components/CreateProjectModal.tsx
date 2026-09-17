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
    serviceTypeIds: string[];
    noTemplate: boolean;
    startDate: string;
  }) => void;
}

export function CreateProjectModal({ clients, serviceTypes, onClose, onCreate }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState(clients[0]?._id ?? '');
  const [serviceTypeIds, setServiceTypeIds] = useState<string[]>(
    serviceTypes[0] ? [serviceTypes[0]._id] : [],
  );
  const [noTemplate, setNoTemplate] = useState(false);
  const [startDate, setStartDate] = useState('');

  const allSelected = serviceTypes.length > 0 && serviceTypeIds.length === serviceTypes.length;

  function toggleServiceType(id: string) {
    setServiceTypeIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function toggleAll() {
    setServiceTypeIds(allSelected ? [] : serviceTypes.map((s) => s._id));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onCreate({
      name,
      description: description || undefined,
      clientId,
      serviceTypeIds,
      noTemplate,
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
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={noTemplate}
            onChange={(e) => setNoTemplate(e.target.checked)}
            className="rounded border-gray-300 text-[#E0176A] focus:ring-[#E0176A]"
          />
          Projeto em branco (sem template de serviço)
        </label>
        {!noTemplate && (
          <fieldset>
            <div className="flex items-center justify-between">
              <legend className="block text-sm text-gray-600">Template serviço</legend>
              <label className="flex items-center gap-1 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300 text-[#E0176A] focus:ring-[#E0176A]"
                />
                Selecionar todos
              </label>
            </div>
            <div className="mt-1 max-h-32 space-y-1 overflow-y-auto rounded border border-gray-300 p-2">
              {serviceTypes.map((serviceType) => (
                <label key={serviceType._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={serviceTypeIds.includes(serviceType._id)}
                    onChange={() => toggleServiceType(serviceType._id)}
                    className="rounded border-gray-300 text-[#E0176A] focus:ring-[#E0176A]"
                  />
                  {serviceType.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
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
            disabled={!noTemplate && serviceTypeIds.length === 0}
            className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
