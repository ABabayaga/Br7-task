import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listServiceTypes, createServiceType, updateServiceType } from '../api/serviceTypes.js';
import { CreateServiceTypeModal } from '../components/CreateServiceTypeModal.js';
import type { ServiceType } from '../types.js';

export function ServiceTypesPage() {
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listServiceTypes().then(setServiceTypes);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string }) {
    await createServiceType(dto);
    setShowModal(false);
    refresh();
  }

  async function handleToggleActive(serviceType: ServiceType) {
    await updateServiceType(serviceType._id, { active: !serviceType.active });
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Tipos de serviço</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo tipo de serviço
        </button>
      </div>

      <ul className="space-y-3">
        {serviceTypes.map((serviceType) => (
          <li
            key={serviceType._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link
              to={`/tipos-servico/${serviceType._id}/etapas`}
              className="font-medium text-[#E0176A] hover:underline"
            >
              {serviceType.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">
                {serviceType.active ? 'ativo' : 'inativo'}
              </span>
              <button
                onClick={() => handleToggleActive(serviceType)}
                className="text-sm text-gray-500 hover:text-gray-800"
              >
                {serviceType.active ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateServiceTypeModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
