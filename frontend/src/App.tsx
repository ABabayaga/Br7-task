import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { AppLayout } from './layouts/AppLayout.js';
import { LoginPage } from './pages/LoginPage.js';
import { HomePage } from './pages/HomePage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { ProjectGanttPage } from './pages/ProjectGanttPage.js';
import { UsersPage } from './pages/UsersPage.js';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/projetos" element={<DashboardPage />} />
              <Route path="/projects/:id" element={<ProjectGanttPage />} />
              <Route path="/usuarios" element={<UsersPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
