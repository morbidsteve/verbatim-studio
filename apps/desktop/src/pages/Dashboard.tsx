import { Button, Card, CardContent, CardHeader, CardTitle } from '@verbatim/ui';
import { FolderOpen, Mic, Upload, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome to Verbatim Studio</h1>
        <p className="mt-2 text-muted-foreground">
          Privacy-first transcription for professionals
        </p>
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
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No recent activity</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start by recording or uploading your first audio file
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
