import { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RecordingIndicator,
} from '@verbatim/ui';
import { Mic, Settings } from 'lucide-react';

type RecordingStatus = 'idle' | 'recording' | 'paused';

export function Recording() {
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);

  const handleStart = () => {
    setStatus('recording');
    // TODO: Implement actual recording
  };

  const handlePause = () => {
    setStatus('paused');
  };

  const handleResume = () => {
    setStatus('recording');
  };

  const handleStop = () => {
    setStatus('idle');
    setDuration(0);
    setAudioLevels([]);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Recording</h1>
        <Button variant="outline" className="gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Recording Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recording Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Input Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Audio Input:</label>
            <Select defaultValue="default">
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select input device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                <SelectItem value="builtin">Built-in Microphone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recording Status */}
          <RecordingIndicator
            status={status}
            duration={duration}
            audioLevels={audioLevels}
            onStart={handleStart}
            onPause={handlePause}
            onResume={handleResume}
            onStop={handleStop}
          />
        </CardContent>
      </Card>

      {/* Real-time Transcript Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Transcript</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="min-h-[200px] rounded-md border bg-muted/50 p-4">
            {status === 'idle' ? (
              <p className="text-center text-muted-foreground">
                Start recording to see live transcription
              </p>
            ) : (
              <p className="text-muted-foreground">
                Transcription will appear here in real-time...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
