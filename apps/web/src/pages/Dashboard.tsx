import { Button } from '@verbatim/ui';
import { useAuth } from '../contexts/AuthContext';

export function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Verbatim Studio</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="outline" onClick={logout}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4">
        <h2 className="mb-4 text-2xl font-bold">Dashboard</h2>
        <p className="text-muted-foreground">
          Welcome to Verbatim Studio Enterprise. This is the web interface.
        </p>
      </main>
    </div>
  );
}
