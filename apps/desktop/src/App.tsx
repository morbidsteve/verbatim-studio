import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Recording } from './pages/Recording';
import { Settings } from './pages/Settings';
import { useTheme } from './hooks/useTheme';
import { useAppStore } from './stores/app-store';
import { useProjectStore } from './stores/project-store';

export function App() {
  const { theme } = useTheme();
  const initialize = useAppStore((state) => state.initialize);
  const loadMockData = useProjectStore((state) => state.loadMockData);

  // Initialize app on mount
  useEffect(() => {
    initialize();
    // Load mock data for demo purposes (will be replaced with real data later)
    loadMockData();
  }, [initialize, loadMockData]);

  return (
    <div className={theme}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:projectId" element={<ProjectDetail />} />
            <Route path="/recording" element={<Recording />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}
