import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TitleBar } from './TitleBar';

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
