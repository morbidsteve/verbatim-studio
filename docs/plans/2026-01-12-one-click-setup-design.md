# One-Click Setup Experience Design

**Date:** 2026-01-12
**Status:** Approved
**Goal:** Make Verbatim Studio "double-click and you're in" - users shouldn't need to touch the terminal.

## Overview

The Electron app handles all Docker orchestration invisibly. Users see a friendly progress screen on launch, and the app "just works" once services are ready.

## Prerequisites

- User must have Docker Desktop installed
- If missing, app prompts and guides them through installation
- Once Docker exists, app handles everything else

## User Flows

### First Launch

1. **Splash screen appears** with app logo and progress indicator
2. **Docker detection:**
   - Check if Docker CLI exists (`docker --version`)
   - Check if Docker daemon is running (`docker info`)
3. **If Docker missing/not running:** Show friendly prompt with action button
4. **Once Docker ready:**
   - Pull container images with progress: "Downloading transcription engine... (45%)"
   - Start containers via embedded Docker Compose
   - Health check each service
5. **Setup complete** → Transition to main app

First launch: 2-5 minutes (depending on download speed, images ~2-4GB)

### Subsequent Launches

1. **Brief splash screen** (~3-5 seconds)
2. **Quick startup:**
   - Verify Docker is running
   - Start containers (`docker compose up -d`)
   - Health check services
   - Status: "Starting transcription service..."
3. **All healthy** → Fade to main app

Startup time: 5-10 seconds (cold), 15-20 seconds (if Docker daemon was stopped)

### App Quit

1. App window closes immediately (responsive feel)
2. Background: `docker compose down`
3. Containers stop gracefully (~2-3 seconds)
4. Container images remain on disk (no re-download next time)

### Error Handling

All errors show on the splash screen with friendly messaging and action buttons.

**Docker not installed:**
```
Docker is required to run Verbatim

Docker powers the transcription engine
that runs on your machine.

[Download Docker Desktop]
[I've installed it →]
```

**Docker not running:**
```
Docker isn't running

[Start Docker]

Clicking will launch Docker Desktop
```
- Button runs `open -a Docker` (macOS) or launches Docker Desktop (Windows)
- Auto-retry detection every 2 seconds
- When ready → continue automatically

**Container fails to start:**
```
Transcription service failed to start

[Retry]    [View Logs]
```
- "Retry" runs `docker compose down && docker compose up`
- "View Logs" shows container logs for debugging

## Technical Architecture

### DockerManager (Electron Main Process)

New module in `apps/desktop/electron/docker-manager.ts`:

```typescript
interface DockerManager {
  // Detection
  checkDockerInstalled(): Promise<boolean>
  checkDockerRunning(): Promise<boolean>

  // Control
  startDocker(): Promise<void>  // Launch Docker Desktop
  pullImages(onProgress: (status: PullProgress) => void): Promise<void>
  startServices(): Promise<void>  // docker compose up -d
  stopServices(): Promise<void>   // docker compose down

  // Monitoring
  healthCheck(): Promise<ServiceHealth[]>
  getLogs(service: string): Promise<string>

  // State
  getStatus(): DockerStatus
}

interface PullProgress {
  service: string
  percent: number
  status: string
}

interface ServiceHealth {
  name: string
  healthy: boolean
  port: number
}

type DockerStatus =
  | { state: 'not-installed' }
  | { state: 'not-running' }
  | { state: 'pulling'; progress: PullProgress }
  | { state: 'starting' }
  | { state: 'ready'; services: ServiceHealth[] }
  | { state: 'error'; message: string; recoverable: boolean }
```

### SetupScreen (React Component)

New component in `apps/desktop/src/components/SetupScreen.tsx`:

- Renders during startup instead of main app
- Shows progress bar, status text, error states
- Communicates with main process via IPC
- Transitions to main app when services ready

### Bundled Docker Compose

File: `apps/desktop/resources/docker-compose.yml`

- Embedded in app resources during build
- References images from Docker Hub / GHCR
- GPU passthrough when available, CPU fallback
- Configured ports for all services

### Startup Flow (Main Process)

```typescript
app.whenReady()
  → show BrowserWindow with SetupScreen
  → DockerManager.checkDockerInstalled()
    → if not: show install prompt, wait
  → DockerManager.checkDockerRunning()
    → if not: show start prompt, attempt startDocker(), wait
  → DockerManager.pullImages() (skip if cached)
  → DockerManager.startServices()
  → DockerManager.healthCheck() (poll until ready)
  → IPC: 'setup:complete'
  → SetupScreen transitions to main App
```

### Shutdown Flow

```typescript
app.on('before-quit', async (event) => {
  event.preventDefault()
  await DockerManager.stopServices()
  app.exit()
})

// Handle orphaned containers on next launch
app.whenReady()
  → DockerManager.cleanupOrphaned()
```

### IPC Channels

```typescript
// Main → Renderer
'setup:status' → DockerStatus
'setup:complete' → void

// Renderer → Main
'setup:install-docker' → opens download page
'setup:start-docker' → attempts to launch Docker Desktop
'setup:retry' → restarts setup flow
'setup:get-logs' → returns container logs
```

## Services Managed

| Service | Image | Port | Health Endpoint |
|---------|-------|------|-----------------|
| whisper-service | `verbatim/whisper-service` | 8001 | `/health` |
| whisper-live | `verbatim/whisper-live` | 8002 | `/health` |
| diarization | `verbatim/diarization` | 8003 | `/health` |
| FastAPI backend | `verbatim/server` | 8000 | `/api/health` |

## File Structure

```
apps/desktop/
├── electron/
│   ├── main.ts                 # Updated startup flow
│   ├── docker-manager.ts       # NEW: Docker orchestration
│   └── preload.ts              # IPC exposure
├── resources/
│   └── docker-compose.yml      # NEW: Bundled compose file
└── src/
    ├── components/
    │   └── SetupScreen.tsx     # NEW: Splash/progress/error UI
    └── App.tsx                 # Updated to show SetupScreen first
```

## Out of Scope (v1)

- Auto-installing Docker (prompt + link only)
- Bundled container runtime (requires Docker Desktop)
- Containers running after app quit
- System tray mode
- Auto-update container images in background

## Future Enhancements

- **v2:** Option to keep containers running (power user setting)
- **v2:** System tray with quick status
- **v3:** Bundled container runtime (no Docker Desktop needed)
- **v3:** Native whisper.cpp fallback for CPU-only machines
