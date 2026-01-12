import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { TranscriptViewer } from './pages/TranscriptViewer';
import { Recording } from './pages/Recording';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { SetupScreen } from './components/SetupScreen';
import { useTheme } from './hooks/useTheme';
import { useAppStore } from './stores/app-store';
import { useAuthStore } from './stores/auth-store';
import { useProjectStore } from './stores/project-store';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { theme } = useTheme();
  const initialize = useAppStore((state) => state.initialize);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);

  // Track whether Docker services are ready
  const [servicesReady, setServicesReady] = useState(false);

  // Initialize app on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Check auth and fetch projects once services are ready
  useEffect(() => {
    if (servicesReady) {
      checkAuth();
    }
  }, [servicesReady, checkAuth]);

  // Fetch projects when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  // Show setup screen until services are ready
  if (!servicesReady) {
    return (
      <div className={theme}>
        <SetupScreen onReady={() => setServicesReady(true)} />
      </div>
    );
  }

  return (
    <div className={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/projects/:projectId/recordings/:recordingId/transcript" element={<TranscriptViewer />} />
            <Route path="/recording" element={<Recording />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
