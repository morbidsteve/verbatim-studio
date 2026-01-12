import { useState, useEffect } from 'react';
import type { DockerStatus, ServiceHealth } from '../../electron/preload';

interface SetupScreenProps {
  onReady: () => void;
}

export function SetupScreen({ onReady }: SetupScreenProps) {
  const [status, setStatus] = useState<DockerStatus>({ state: 'starting', message: 'Initializing...' });
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    // Subscribe to status changes from main process
    const unsubscribe = window.electronAPI.docker.onStatusChange((newStatus) => {
      setStatus(newStatus);
      if (newStatus.state === 'ready') {
        // Small delay for smooth transition
        setTimeout(onReady, 500);
      }
    });

    // Start the setup process
    startSetup();

    return unsubscribe;
  }, [onReady]);

  const startSetup = async () => {
    try {
      await window.electronAPI.docker.ensureReady();
    } catch (error) {
      // Error state will be set via onStatusChange
      console.error('Setup failed:', error);
    }
  };

  const handleInstallDocker = () => {
    window.electronAPI.docker.openDownloadPage();
  };

  const handleStartDocker = async () => {
    setRetrying(true);
    setStatus({ state: 'starting', message: 'Starting Docker...' });
    try {
      const started = await window.electronAPI.docker.startDocker();
      if (started) {
        // Continue setup
        await startSetup();
      } else {
        setStatus({ state: 'not-running' });
      }
    } catch {
      setStatus({ state: 'not-running' });
    } finally {
      setRetrying(false);
    }
  };

  const handleRetryCheck = async () => {
    setRetrying(true);
    const installed = await window.electronAPI.docker.checkInstalled();
    if (installed) {
      const running = await window.electronAPI.docker.checkRunning();
      if (running) {
        await startSetup();
      } else {
        setStatus({ state: 'not-running' });
      }
    } else {
      setStatus({ state: 'not-installed' });
    }
    setRetrying(false);
  };

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await window.electronAPI.docker.restartServices();
      await startSetup();
    } catch {
      // Will be handled by status change
    } finally {
      setRetrying(false);
    }
  };

  const handleViewLogs = async () => {
    const logs = await window.electronAPI.docker.getLogs();
    // For now, log to console - could show in a modal
    console.log('Docker Logs:', logs);
    // Open dev tools to see logs
    alert('Logs have been printed to the developer console.\n\nPress Cmd+Option+I (Mac) or Ctrl+Shift+I (Windows) to view.');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center max-w-md px-8 text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">Verbatim Studio</h1>

        {/* Status-specific content */}
        {status.state === 'not-installed' && (
          <NotInstalledState
            onInstall={handleInstallDocker}
            onRetry={handleRetryCheck}
            retrying={retrying}
          />
        )}

        {status.state === 'not-running' && (
          <NotRunningState
            onStart={handleStartDocker}
            retrying={retrying}
          />
        )}

        {status.state === 'pulling' && (
          <PullingState progress={status.progress} />
        )}

        {status.state === 'starting' && (
          <StartingState message={status.message} />
        )}

        {status.state === 'ready' && (
          <ReadyState services={status.services} />
        )}

        {status.state === 'error' && (
          <ErrorState
            message={status.message}
            recoverable={status.recoverable}
            onRetry={handleRetry}
            onViewLogs={handleViewLogs}
            retrying={retrying}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components for each state
// ============================================================================

function NotInstalledState({
  onInstall,
  onRetry,
  retrying,
}: {
  onInstall: () => void;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <>
      <p className="text-zinc-400 mb-6">
        Docker is required to run Verbatim Studio's transcription engine.
      </p>
      <div className="flex flex-col gap-3 w-full">
        <button
          onClick={onInstall}
          className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Download Docker Desktop
        </button>
        <button
          onClick={onRetry}
          disabled={retrying}
          className="w-full px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {retrying ? 'Checking...' : "I've installed it →"}
        </button>
      </div>
    </>
  );
}

function NotRunningState({
  onStart,
  retrying,
}: {
  onStart: () => void;
  retrying: boolean;
}) {
  return (
    <>
      <p className="text-zinc-400 mb-6">Docker isn't running.</p>
      <button
        onClick={onStart}
        disabled={retrying}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {retrying ? 'Starting Docker...' : 'Start Docker'}
      </button>
      <p className="text-zinc-500 text-sm mt-3">
        This will launch Docker Desktop
      </p>
    </>
  );
}

function PullingState({ progress }: { progress: { service: string; percent: number; status: string } }) {
  return (
    <>
      <p className="text-zinc-400 mb-4">Downloading transcription services...</p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-blue-600 transition-all duration-300"
          style={{ width: `${Math.max(progress.percent, 5)}%` }}
        />
      </div>

      <p className="text-zinc-500 text-sm">
        {progress.service ? `${progress.service}: ${progress.status}` : 'Preparing...'}
      </p>
    </>
  );
}

function StartingState({ message }: { message: string }) {
  return (
    <>
      <div className="mb-4">
        <Spinner />
      </div>
      <p className="text-zinc-400">{message}</p>
    </>
  );
}

function ReadyState({ services }: { services: ServiceHealth[] }) {
  return (
    <>
      <div className="mb-4 text-green-500">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-zinc-400">
        {services.length} services ready
      </p>
    </>
  );
}

function ErrorState({
  message,
  recoverable,
  onRetry,
  onViewLogs,
  retrying,
}: {
  message: string;
  recoverable: boolean;
  onRetry: () => void;
  onViewLogs: () => void;
  retrying: boolean;
}) {
  return (
    <>
      <div className="mb-4 text-red-500">
        <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="text-zinc-400 mb-4">{message}</p>
      <div className="flex gap-3 w-full">
        {recoverable && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        )}
        <button
          onClick={onViewLogs}
          className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium transition-colors"
        >
          View Logs
        </button>
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="w-8 h-8 animate-spin text-blue-500"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
