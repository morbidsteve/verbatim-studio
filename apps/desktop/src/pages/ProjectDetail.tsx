import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@verbatim/ui';
import {
  ArrowLeft,
  Upload,
  Mic,
  FileAudio,
  Video,
  Clock,
  HardDrive,
  MoreVertical,
  Play,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useProjectStore, type Recording } from '../stores/project-store';

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const projects = useProjectStore((state) => state.projects);
  const recordings = useProjectStore((state) => state.recordings);
  const addRecording = useProjectStore((state) => state.addRecording);
  const deleteRecording = useProjectStore((state) => state.deleteRecording);
  const updateProject = useProjectStore((state) => state.updateProject);

  const project = projects.find((p) => p.id === projectId);
  const projectRecordings = recordings.get(projectId || '') || [];

  const handleUpload = useCallback(async () => {
    if (!projectId || typeof window.electronAPI === 'undefined') return;

    try {
      const result = await window.electronAPI.file.openMultipleDialog({
        title: 'Select audio or video files',
        filters: [
          { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac'] },
          { name: 'Video Files', extensions: ['mp4', 'mov', 'avi', 'mkv', 'webm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) return;

      setUploading(true);

      for (const filePath of result.filePaths) {
        const audioInfo = await window.electronAPI.audio.getInfo(filePath);

        const newRecording: Recording = {
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          projectId,
          name: audioInfo.name,
          sourceType: 'upload',
          mediaType: audioInfo.format === 'mp4' || audioInfo.format === 'mov' ? 'video' : 'audio',
          format: audioInfo.format,
          duration: audioInfo.duration || 0,
          size: audioInfo.size,
          storagePath: filePath,
          transcriptionStatus: 'pending',
          transcriptionProgress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        addRecording(newRecording);
      }

      // Update project stats
      const updatedRecordings = recordings.get(projectId) || [];
      updateProject(projectId, {
        recordingCount: updatedRecordings.length + result.filePaths.length,
      });
    } catch (error) {
      console.error('Failed to upload files:', error);
    } finally {
      setUploading(false);
    }
  }, [projectId, addRecording, updateProject, recordings]);

  const handleDeleteRecording = () => {
    if (!recordingToDelete || !projectId) return;
    deleteRecording(recordingToDelete);
    updateProject(projectId, { recordingCount: Math.max(0, projectRecordings.length - 1) });
    setRecordingToDelete(null);
    setDeleteDialogOpen(false);
  };

  const confirmDelete = (recordingId: string) => {
    setRecordingToDelete(recordingId);
    setDeleteDialogOpen(true);
  };

  const getStatusIcon = (status: Recording['transcriptionStatus']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <p className="text-lg font-medium">Project not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/recording')}>
              <Mic className="h-4 w-4" />
              Record
            </Button>
            <Button className="gap-2" onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <FileAudio className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projectRecordings.length}</p>
                <p className="text-sm text-muted-foreground">Recordings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatDuration(projectRecordings.reduce((sum, r) => sum + r.duration, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <HardDrive className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {formatBytes(projectRecordings.reduce((sum, r) => sum + r.size, 0))}
                </p>
                <p className="text-sm text-muted-foreground">Storage Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recordings List */}
      <Card>
        <CardHeader>
          <CardTitle>Recordings</CardTitle>
        </CardHeader>
        <CardContent>
          {projectRecordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileAudio className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No recordings yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload audio files or start a live recording
              </p>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => navigate('/recording')}>
                  <Mic className="h-4 w-4" />
                  Record
                </Button>
                <Button className="gap-2" onClick={handleUpload}>
                  <Upload className="h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {projectRecordings.map((recording) => (
                <div
                  key={recording.id}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      {recording.mediaType === 'video' ? (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <FileAudio className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{recording.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {recording.format.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {recording.sourceType}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatDuration(recording.duration)}</span>
                        <span>{formatBytes(recording.size)}</span>
                        <span>{formatRelativeTime(recording.createdAt)}</span>
                      </div>
                      {recording.transcriptionStatus === 'processing' && (
                        <div className="mt-2 w-48">
                          <Progress value={recording.transcriptionProgress} className="h-1" />
                          <p className="mt-1 text-xs text-muted-foreground">
                            Transcribing... {recording.transcriptionProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(recording.transcriptionStatus)}
                      <span className="text-sm capitalize">{recording.transcriptionStatus}</span>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </DropdownMenuItem>
                        {recording.transcriptionStatus === 'completed' && (
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Transcript
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => confirmDelete(recording.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recording</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRecording}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
