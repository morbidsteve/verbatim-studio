import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  FolderOpen,
  Mic,
  Settings,
  Search,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@verbatim/ui';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/projects', icon: FolderOpen, label: 'Projects' },
  { path: '/recording', icon: Mic, label: 'Record' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="flex w-16 flex-col items-center border-r bg-card py-4">
      <nav className="flex flex-1 flex-col items-center gap-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/settings"
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors',
          location.pathname === '/settings'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </NavLink>
    </aside>
  );
}
