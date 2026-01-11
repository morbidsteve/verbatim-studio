import { Minus, Square, X } from 'lucide-react';
import { cn } from '@verbatim/ui';

export function TitleBar() {
  const isMac = navigator.platform.toLowerCase().includes('mac');

  const handleMinimize = () => window.electronAPI?.window.minimize();
  const handleMaximize = () => window.electronAPI?.window.maximize();
  const handleClose = () => window.electronAPI?.window.close();

  return (
    <header
      className={cn(
        'drag-region flex h-10 items-center border-b bg-card',
        isMac ? 'pl-20 pr-4' : 'px-4'
      )}
    >
      <div className="flex-1">
        <span className="text-sm font-semibold">Verbatim Studio</span>
      </div>

      {/* Windows/Linux controls */}
      {!isMac && (
        <div className="no-drag flex items-center gap-1">
          <button
            onClick={handleMinimize}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={handleMaximize}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-accent"
          >
            <Square className="h-3 w-3" />
          </button>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
