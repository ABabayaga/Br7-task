import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, archiveProject } from '../api/projects.js';
import { listClients } from '../api/clients.js';
import { listServiceTypes } from '../api/serviceTypes.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import type { Client, Project, ServiceType } from '../types.js';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listProjects().then(setProjects);
  }

  useEffect(refresh, []);
  useEffect(() => {
    listClients().then((all) => setClients(all.filter((c) => c.active)));
    listServiceTypes().then((all) => setServiceTypes(all.filter((s) => s.active)));
  }, []);

  async function handleCreate(dto: {
    name: string;
    description?: string;
    clientId: string;
    serviceTypeId: string;
    startDate: string;
  }) {
    await createProject(dto);
    setShowModal(false);
    refresh();
  }

  async function handleArchive(id: string) {
    await archiveProject(id);
    refresh();
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Projetos</h1>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-linear-to-r from-[#E0176A] to-[#FF5A36] px-4 py-2 font-medium text-white transition-transform hover:scale-[1.02]"
        >
          Novo projeto
        </button>
      </div>

      <ul className="space-y-3">
        {projects.map((project) => (
          <li
            key={project._id}
            className="flex items-center justify-between rounded border border-gray-200 bg-white p-4 shadow-sm"
          >
            <Link to={`/projects/${project._id}`} className="font-medium text-[#E0176A] hover:underline">
              {project.name}
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-gray-500">{project.status}</span>
              {project.status === 'active' && (
                <button onClick={() => handleArchive(project._id)} className="text-sm text-gray-500 hover:text-gray-800">
                  Arquivar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showModal && (
        <CreateProjectModal
          clients={clients}
          serviceTypes={serviceTypes}
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
