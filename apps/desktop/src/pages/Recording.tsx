import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { Mic, Settings, Save, X, FolderOpen } from 'lucide-react';
import { useProjectStore } from '../stores/project-store';

type RecordingStatus = 'idle' | 'recording' | 'paused';

interface AudioDevice {
  deviceId: string;
  label: string;
}

export function Recording() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectIdParam = searchParams.get('project');

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>([]);
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const projects = useProjectStore((state) => state.projects);
  const uploadRecording = useProjectStore((state) => state.uploadRecording);

  // Get audio devices
  useEffect(() => {
    async function getDevices() {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = deviceList
          .filter((device) => device.kind === 'audioinput')
          .map((device) => ({
            deviceId: device.deviceId,
            label: device.label || `Microphone ${device.deviceId.slice(0, 8)}`,
          }));
        setDevices(audioInputs);
        if (audioInputs.length > 0 && selectedDevice === 'default') {
          setSelectedDevice(audioInputs[0]?.deviceId || 'default');
        }
      } catch (err) {
        setError('Microphone access denied. Please allow microphone access to record.');
        console.error('Failed to get audio devices:', err);
      }
    }
    getDevices();
  }, [selectedDevice]);

  // Set project from URL param
  useEffect(() => {
    if (projectIdParam) {
      setSelectedProjectId(projectIdParam);
    }
  }, [projectIdParam]);

  // Update audio levels visualization
  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Get average level from 8 frequency bands
    const bandSize = Math.floor(dataArray.length / 8);
    const levels: number[] = [];
    for (let i = 0; i < 8; i++) {
      let sum = 0;
      for (let j = 0; j < bandSize; j++) {
        sum += dataArray[i * bandSize + j] ?? 0;
      }
      levels.push(sum / bandSize / 255); // Normalize to 0-1
    }
    setAudioLevels(levels);

    if (status === 'recording') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
    }
  }, [status]);

  const handleStart = async () => {
    setError(null);
    chunksRef.current = [];

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDevice !== 'default'
          ? { deviceId: { exact: selectedDevice } }
          : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Set up audio analysis for visualization
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Set up media recorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.start(1000); // Collect data every second
      setStatus('recording');
      setDuration(0);

      // Start timer
      const startTime = Date.now();
      timerRef.current = window.setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);

      // Start audio visualization
      updateAudioLevels();
    } catch (err) {
      setError('Failed to start recording. Please check microphone permissions.');
      console.error('Failed to start recording:', err);
    }
  };

  const handlePause = () => {
    if (mediaRecorderRef.current && status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  const handleResume = () => {
    if (mediaRecorderRef.current && status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');

      // Resume timer
      const currentDuration = duration;
      const startTime = Date.now() - currentDuration;
      timerRef.current = window.setInterval(() => {
        setDuration(Date.now() - startTime);
      }, 100);

      // Resume audio visualization
      updateAudioLevels();
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Clear animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setStatus('idle');
    setAudioLevels([]);
  };

  const handleDiscard = () => {
    handleStop();
    chunksRef.current = [];
    setDuration(0);
  };

  const handleSave = async () => {
    if (!selectedProjectId) {
      setError('Please select a project to save the recording to.');
      return;
    }

    if (chunksRef.current.length === 0) {
      setError('No recording data to save.');
      return;
    }

    handleStop();
    setIsSaving(true);
    setError(null);

    try {
      // Create blob from chunks
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });

      // Create a file with timestamp name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `recording-${timestamp}.webm`, { type: 'audio/webm' });

      // Upload to API
      await uploadRecording(selectedProjectId, file, `Recording ${new Date().toLocaleString()}`);

      // Reset state
      chunksRef.current = [];
      setDuration(0);

      // Navigate to project detail
      navigate(`/projects/${selectedProjectId}`);
    } catch (err) {
      setError('Failed to save recording. Please try again.');
      console.error('Failed to save recording:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const hasRecordedData = chunksRef.current.length > 0 || status !== 'idle';

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Recording</h1>
        <Button variant="outline" className="gap-2" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Recording Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Recording Controls
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              Save to Project:
            </label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.filter(p => p.status === 'active').map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.filter(p => p.status === 'active').length === 0 && (
              <span className="text-sm text-muted-foreground">
                No projects available.{' '}
                <button
                  onClick={() => navigate('/projects')}
                  className="text-blue-600 hover:underline"
                >
                  Create one
                </button>
              </span>
            )}
          </div>

          {/* Input Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium whitespace-nowrap">
              <Mic className="inline h-4 w-4 mr-1" />
              Audio Input:
            </label>
            <Select
              value={selectedDevice}
              onValueChange={setSelectedDevice}
              disabled={status !== 'idle'}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select input device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {devices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
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

          {/* Save/Discard buttons when recording is stopped with data */}
          {status === 'idle' && hasRecordedData && duration > 0 && (
            <div className="flex justify-center gap-4 pt-4 border-t">
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDiscard}
                disabled={isSaving}
              >
                <X className="h-4 w-4" />
                Discard
              </Button>
              <Button
                className="gap-2"
                onClick={handleSave}
                disabled={isSaving || !selectedProjectId}
              >
                {isSaving ? (
                  <>
                    <span className="animate-spin">&#9696;</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Recording
                  </>
                )}
              </Button>
            </div>
          )}
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
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  Real-time transcription will be available once connected to the transcription service...
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Recording in progress
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audio Visualization */}
      {status !== 'idle' && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Audio Levels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-1 h-24">
              {audioLevels.length > 0 ? (
                audioLevels.map((level, index) => (
                  <div
                    key={index}
                    className="w-8 bg-blue-500 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(4, level * 100)}%` }}
                  />
                ))
              ) : (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-8 h-1 bg-muted-foreground/20 rounded-t"
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
