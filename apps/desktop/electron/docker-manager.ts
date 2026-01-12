import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { app, shell } from 'electron';

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface PullProgress {
  service: string;
  percent: number;
  status: string;
}

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  port: number;
  error?: string;
}

export type DockerStatus =
  | { state: 'not-installed' }
  | { state: 'not-running' }
  | { state: 'pulling'; progress: PullProgress }
  | { state: 'starting'; message: string }
  | { state: 'ready'; services: ServiceHealth[] }
  | { state: 'error'; message: string; recoverable: boolean };

export interface DockerManagerEvents {
  onStatusChange: (status: DockerStatus) => void;
  onPullProgress: (progress: PullProgress) => void;
}

// ============================================================================
// Configuration
// ============================================================================

const SERVICES = [
  { name: 'whisper-service', port: 8001, healthPath: '/health' },
  { name: 'diarization', port: 8003, healthPath: '/health' },
  { name: 'api-server', port: 8000, healthPath: '/api/health' },
] as const;

const HEALTH_CHECK_TIMEOUT = 5000;
const HEALTH_CHECK_INTERVAL = 1000;
const MAX_STARTUP_TIME = 120000; // 2 minutes max for services to become healthy

// ============================================================================
// DockerManager Class
// ============================================================================

export class DockerManager {
  private status: DockerStatus = { state: 'not-installed' };
  private events: Partial<DockerManagerEvents> = {};
  private composeFilePath: string;
  private projectName = 'verbatim-studio';

  constructor() {
    // In development, use the docker/basic compose file
    // In production, use bundled resources
    if (app.isPackaged) {
      this.composeFilePath = path.join(process.resourcesPath, 'docker-compose.yml');
    } else {
      this.composeFilePath = path.join(app.getAppPath(), '..', '..', 'docker', 'basic', 'docker-compose.yml');
    }
  }

  // --------------------------------------------------------------------------
  // Event Handling
  // --------------------------------------------------------------------------

  on<K extends keyof DockerManagerEvents>(event: K, handler: DockerManagerEvents[K]) {
    this.events[event] = handler;
  }

  private setStatus(status: DockerStatus) {
    this.status = status;
    this.events.onStatusChange?.(status);
  }

  getStatus(): DockerStatus {
    return this.status;
  }

  // --------------------------------------------------------------------------
  // Docker Detection
  // --------------------------------------------------------------------------

  async checkDockerInstalled(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch {
      return false;
    }
  }

  async checkDockerRunning(): Promise<boolean> {
    try {
      await execAsync('docker info', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  async getDockerVersion(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('docker --version');
      return stdout.trim();
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // Docker Control
  // --------------------------------------------------------------------------

  async startDocker(): Promise<boolean> {
    const platform = process.platform;

    try {
      if (platform === 'darwin') {
        // macOS: Open Docker Desktop
        await shell.openPath('/Applications/Docker.app');
      } else if (platform === 'win32') {
        // Windows: Launch Docker Desktop
        await execAsync('start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe"');
      } else {
        // Linux: Try to start docker service
        await execAsync('systemctl start docker');
      }

      // Wait for Docker to become available
      const maxWait = 60000; // 60 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWait) {
        if (await this.checkDockerRunning()) {
          return true;
        }
        await this.sleep(2000);
      }

      return false;
    } catch {
      return false;
    }
  }

  openDockerDownloadPage(): void {
    const platform = process.platform;
    let url = 'https://www.docker.com/products/docker-desktop/';

    if (platform === 'darwin') {
      url = 'https://desktop.docker.com/mac/main/arm64/Docker.dmg'; // Apple Silicon default
    } else if (platform === 'win32') {
      url = 'https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe';
    }

    shell.openExternal(url);
  }

  // --------------------------------------------------------------------------
  // Image Management
  // --------------------------------------------------------------------------

  async pullImages(onProgress?: (progress: PullProgress) => void): Promise<void> {
    // Check if compose file exists
    try {
      await fs.access(this.composeFilePath);
    } catch {
      throw new Error(`Docker Compose file not found: ${this.composeFilePath}`);
    }

    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);

    return new Promise((resolve, reject) => {
      const proc = spawn('docker', ['compose', '-f', composeFile, '-p', this.projectName, 'pull'], {
        cwd: composeDir,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let currentService = '';
      let errorOutput = '';

      const parseProgress = (data: string) => {
        const lines = data.toString().split('\n');
        for (const line of lines) {
          // Parse docker compose pull output
          // Format varies, but typically: "Pulling service_name ... downloading/extracting"
          const pullMatch = line.match(/Pulling (\S+)/i);
          if (pullMatch && pullMatch[1]) {
            currentService = pullMatch[1];
          }

          const progressMatch = line.match(/(\d+(?:\.\d+)?%)/);
          const percent = progressMatch && progressMatch[1] ? parseFloat(progressMatch[1]) : 0;

          if (currentService) {
            const progress: PullProgress = {
              service: currentService,
              percent,
              status: line.trim() || 'Downloading...',
            };
            onProgress?.(progress);
            this.events.onPullProgress?.(progress);
          }
        }
      };

      proc.stdout?.on('data', parseProgress);
      proc.stderr?.on('data', (data) => {
        parseProgress(data);
        errorOutput += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to pull images: ${errorOutput}`));
        }
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to run docker compose pull: ${err.message}`));
      });
    });
  }

  async imagesExist(): Promise<boolean> {
    try {
      const composeDir = path.dirname(this.composeFilePath);
      const composeFile = path.basename(this.composeFilePath);

      // List images for the compose project
      const { stdout } = await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} images -q`,
        { cwd: composeDir }
      );

      // If we get output, images exist
      return stdout.trim().length > 0;
    } catch {
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // Service Management
  // --------------------------------------------------------------------------

  async startServices(): Promise<void> {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);

    this.setStatus({ state: 'starting', message: 'Starting services...' });

    try {
      // Start services in detached mode
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} up -d`,
        { cwd: composeDir, timeout: 60000 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to start services: ${message}`);
    }
  }

  async stopServices(): Promise<void> {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);

    try {
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} down`,
        { cwd: composeDir, timeout: 30000 }
      );
    } catch (error) {
      // Log but don't throw - we're shutting down anyway
      console.error('Error stopping services:', error);
    }
  }

  async restartServices(): Promise<void> {
    await this.stopServices();
    await this.startServices();
  }

  async cleanupOrphaned(): Promise<void> {
    const composeDir = path.dirname(this.composeFilePath);
    const composeFile = path.basename(this.composeFilePath);

    try {
      // Remove any orphaned containers from previous runs
      await execAsync(
        `docker compose -f ${composeFile} -p ${this.projectName} down --remove-orphans`,
        { cwd: composeDir, timeout: 30000 }
      );
    } catch {
      // Ignore errors - this is cleanup
    }
  }

  // --------------------------------------------------------------------------
  // Health Checks
  // --------------------------------------------------------------------------

  async checkServiceHealth(service: (typeof SERVICES)[number]): Promise<ServiceHealth> {
    const url = `http://localhost:${service.port}${service.healthPath}`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      return {
        name: service.name,
        port: service.port,
        healthy: response.ok,
      };
    } catch (error) {
      return {
        name: service.name,
        port: service.port,
        healthy: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  async healthCheck(): Promise<ServiceHealth[]> {
    const results = await Promise.all(SERVICES.map((s) => this.checkServiceHealth(s)));
    return results;
  }

  async waitForHealthy(): Promise<ServiceHealth[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_STARTUP_TIME) {
      const health = await this.healthCheck();
      const allHealthy = health.every((s) => s.healthy);

      if (allHealthy) {
        return health;
      }

      // Update status with current health info
      const healthyCount = health.filter((s) => s.healthy).length;
      this.setStatus({
        state: 'starting',
        message: `Starting services... (${healthyCount}/${health.length} ready)`,
      });

      await this.sleep(HEALTH_CHECK_INTERVAL);
    }

    // Timeout - return current state
    const finalHealth = await this.healthCheck();
    const unhealthy = finalHealth.filter((s) => !s.healthy);

    throw new Error(
      `Services failed to start: ${unhealthy.map((s) => s.name).join(', ')}`
    );
  }

  // --------------------------------------------------------------------------
  // Logs
  // --------------------------------------------------------------------------

  async getLogs(service: string, lines = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker compose -p ${this.projectName} logs --tail=${lines} ${service}`,
        { cwd: path.dirname(this.composeFilePath) }
      );
      return stdout;
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to get logs';
    }
  }

  async getAllLogs(lines = 50): Promise<string> {
    try {
      const { stdout } = await execAsync(
        `docker compose -p ${this.projectName} logs --tail=${lines}`,
        { cwd: path.dirname(this.composeFilePath) }
      );
      return stdout;
    } catch (error) {
      return error instanceof Error ? error.message : 'Failed to get logs';
    }
  }

  // --------------------------------------------------------------------------
  // Full Startup Sequence
  // --------------------------------------------------------------------------

  async ensureReady(): Promise<void> {
    // Step 1: Check Docker installed
    if (!(await this.checkDockerInstalled())) {
      this.setStatus({ state: 'not-installed' });
      throw new Error('Docker is not installed');
    }

    // Step 2: Check Docker running
    if (!(await this.checkDockerRunning())) {
      this.setStatus({ state: 'not-running' });
      throw new Error('Docker is not running');
    }

    // Step 3: Pull images if needed
    if (!(await this.imagesExist())) {
      this.setStatus({ state: 'pulling', progress: { service: '', percent: 0, status: 'Preparing...' } });
      await this.pullImages((progress) => {
        this.setStatus({ state: 'pulling', progress });
      });
    }

    // Step 4: Cleanup any orphaned containers
    await this.cleanupOrphaned();

    // Step 5: Start services
    await this.startServices();

    // Step 6: Wait for healthy
    const health = await this.waitForHealthy();
    this.setStatus({ state: 'ready', services: health });
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const dockerManager = new DockerManager();
