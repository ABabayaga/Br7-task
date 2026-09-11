import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-gray-800">Bem-vindo(a) ao BR7 Tasks</h1>
      <p className="mt-2 text-gray-600">
        Acompanhe o andamento dos projetos e tarefas da equipe.
      </p>
      <Link
        to="/projetos"
        className="mt-6 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Ver projetos
      </Link>
    </div>
  );
}
