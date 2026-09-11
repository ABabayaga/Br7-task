import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
  }`;

export function AppLayout() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col justify-between border-r border-gray-200 bg-white p-4">
        <div>
          <div className="mb-6 px-3 text-lg font-bold text-gray-800">BR7 Tasks</div>
          <nav className="space-y-1">
            <NavLink to="/" end className={navItemClass}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Home
            </NavLink>
            <NavLink to="/projetos" className={navItemClass}>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Projetos
            </NavLink>
            {role === 'admin' && (
              <NavLink to="/usuarios" className={navItemClass}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4" />
                </svg>
                Usuários
              </NavLink>
            )}
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 rounded px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>
      </aside>

      <main className="flex-1 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
