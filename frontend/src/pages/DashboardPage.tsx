import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, createProject, archiveProject } from '../api/projects.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import type { Project } from '../types.js';

export function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);

  function refresh() {
    listProjects().then(setProjects);
  }

  useEffect(refresh, []);

  async function handleCreate(dto: { name: string; description?: string }) {
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
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
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
            <Link to={`/projects/${project._id}`} className="font-medium text-blue-700 hover:underline">
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
        <CreateProjectModal onClose={() => setShowModal(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
