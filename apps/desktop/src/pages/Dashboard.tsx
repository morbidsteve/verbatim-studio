import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@verbatim/ui';
import { FolderOpen, Mic, Upload, Clock, FileAudio, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../stores/project-store';
import { useAppStore } from '../stores/app-store';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const projects = useProjectStore((state) => state.projects);
  const recordings = useProjectStore((state) => state.recordings);
  const services = useAppStore((state) => state.services);
  const version = useAppStore((state) => state.version);

  // Calculate statistics
  const activeProjects = projects.filter((p) => p.status === 'active');
  const totalRecordings = Array.from(recordings.values()).flat().length;
  const totalDuration = projects.reduce((sum, p) => sum + p.totalDuration, 0);

  // Get all recordings for recent activity
  const allRecordings = Array.from(recordings.values())
    .flat()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  // Service status
  const runningServices = Object.values(services).filter((s) => s.status === 'running').length;
  const totalServices = Object.keys(services).length;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to Verbatim Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Privacy-first transcription for professionals
          {version && <span className="ml-2 text-xs">v{version}</span>}
        </p>
      </div>

      {/* Statistics */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FolderOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeProjects.length}</p>
                <p className="text-sm text-muted-foreground">Active Projects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <FileAudio className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRecordings}</p>
                <p className="text-sm text-muted-foreground">Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Clock className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(totalDuration)}</p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Activity className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {runningServices}/{totalServices || '-'}
                </p>
                <p className="text-sm text-muted-foreground">Services</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => navigate('/recording')}
        >
          <Mic className="h-6 w-6" />
          <span>Start Recording</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => navigate('/projects?action=upload')}
        >
          <Upload className="h-6 w-6" />
          <span>Upload File</span>
        </Button>
        <Button
          variant="outline"
          className="h-24 flex-col gap-2"
          onClick={() => navigate('/projects')}
        >
          <FolderOpen className="h-6 w-6" />
          <span>Browse Projects</span>
        </Button>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allRecordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">No recent activity</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Start by recording or uploading your first audio file
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allRecordings.map((recording) => {
                const project = projects.find((p) => p.id === recording.projectId);
                return (
                  <div
                    key={recording.id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/projects/${recording.projectId}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2">
                        <FileAudio className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{recording.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {project?.name} · {formatDuration(recording.duration)} · {formatBytes(recording.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          recording.transcriptionStatus === 'completed'
                            ? 'default'
                            : recording.transcriptionStatus === 'processing'
                            ? 'secondary'
                            : recording.transcriptionStatus === 'failed'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {recording.transcriptionStatus}
                        {recording.transcriptionStatus === 'processing' &&
                          ` (${recording.transcriptionProgress}%)`}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatRelativeTime(recording.updatedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
