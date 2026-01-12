import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Card,
  CardContent,
  Badge,
  Slider,
  Separator,
} from '@verbatim/ui';
import {
  ArrowLeft,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Save,
  Undo2,
  Download,
  Settings2,
  User,
  Clock,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useTranscriptStore,
  formatTime,
  type TranscriptSegment,
  type SpeakerProfile,
} from '../stores/transcript-store';
import { useProjectStore } from '../stores/project-store';
import { ExportDialog } from '../components/ExportDialog';

// Speaker colors for visualization
const SPEAKER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-yellow-500',
  'bg-red-500',
];

function getSpeakerColor(speakerId: string, speakers: SpeakerProfile[]): string {
  const speaker = speakers.find((s) => s.id === speakerId);
  if (speaker?.color) return speaker.color;

  // Generate consistent color based on speaker index
  const index = speakers.findIndex((s) => s.id === speakerId);
  return SPEAKER_COLORS[index % SPEAKER_COLORS.length] || SPEAKER_COLORS[0] || 'bg-gray-500';
}

function getSpeakerName(speakerId: string, speakers: SpeakerProfile[]): string {
  const speaker = speakers.find((s) => s.id === speakerId);
  return speaker?.name || speakerId.replace('speaker_', 'Speaker ');
}

interface SegmentProps {
  segment: TranscriptSegment;
  speakers: SpeakerProfile[];
  isActive: boolean;
  isEditing: boolean;
  onSeek: () => void;
  onStartEdit: () => void;
  onTextChange: (text: string) => void;
  onStopEdit: () => void;
}

function Segment({
  segment,
  speakers,
  isActive,
  isEditing,
  onSeek,
  onStartEdit,
  onTextChange,
  onStopEdit,
}: SegmentProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [isEditing]);

  const speakerName = getSpeakerName(segment.speakerId, speakers);
  const speakerColor = getSpeakerColor(segment.speakerId, speakers);

  return (
    <div
      className={`group rounded-lg border p-3 transition-colors ${
        isActive ? 'border-primary bg-primary/5' : 'border-transparent hover:border-muted'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Speaker indicator */}
        <div className="flex flex-col items-center gap-1">
          <div
            className={`h-8 w-8 rounded-full ${speakerColor} flex items-center justify-center text-white text-xs font-medium`}
          >
            {speakerName.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onSeek}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {formatTime(segment.startTime)}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{speakerName}</span>
            {segment.confidence < 0.7 && (
              <Badge variant="outline" className="text-xs text-yellow-600">
                Low confidence
              </Badge>
            )}
            {segment.isEdited && (
              <Badge variant="outline" className="text-xs">
                Edited
              </Badge>
            )}
          </div>

          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={segment.text}
              onChange={(e) => onTextChange(e.target.value)}
              onBlur={onStopEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onStopEdit();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onStopEdit();
                }
              }}
              className="w-full min-h-[60px] p-2 text-sm bg-background border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          ) : (
            <p
              onClick={onStartEdit}
              className="text-sm leading-relaxed cursor-text hover:bg-muted/50 rounded p-1 -m-1"
            >
              {segment.text}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TranscriptViewer() {
  const { projectId, recordingId } = useParams<{ projectId: string; recordingId: string }>();
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Project store for recording info
  const recordings = useProjectStore((state) => state.recordings);
  const recording = recordings.get(projectId || '')?.find((r) => r.id === recordingId);

  // Transcript store
  const {
    transcript,
    mediaUrl,
    currentTime,
    duration,
    isPlaying,
    playbackSpeed,
    volume,
    isMuted,
    activeSegmentIndex,
    editingSegmentId,
    unsavedChanges,
    isLoading,
    error,
    autoScroll,
    loadTranscript,
    unloadTranscript,
    setCurrentTime,
    setDuration,
    pause,
    togglePlayPause,
    seek,
    skipForward,
    skipBackward,
    setPlaybackSpeed,
    setVolume,
    toggleMute,
    seekToSegment,
    startEditing,
    stopEditing,
    updateSegmentText,
    saveChanges,
    discardChanges,
    setAutoScroll,
  } = useTranscriptStore();

  // Load transcript on mount
  useEffect(() => {
    if (recordingId) {
      loadTranscript(recordingId);
    }
    return () => {
      unloadTranscript();
    };
  }, [recordingId, loadTranscript, unloadTranscript]);

  // Sync audio element with store state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(console.error);
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // Audio event handlers
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime * 1000);
    }
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      setDuration(audio.duration * 1000);
    }
  }, [setDuration]);

  const handleSeek = useCallback(
    (timeMs: number) => {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = timeMs / 1000;
        seek(timeMs);
      }
    },
    [seek]
  );

  const handleEnded = useCallback(() => {
    pause();
  }, [pause]);

  // Auto-scroll to active segment
  useEffect(() => {
    if (!autoScroll || activeSegmentIndex === null || !transcriptRef.current) return;

    const segmentElement = transcriptRef.current.querySelector(
      `[data-segment-index="${activeSegmentIndex}"]`
    );
    if (segmentElement) {
      segmentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeSegmentIndex, autoScroll]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when editing text
      if (editingSegmentId) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward(e.shiftKey ? 10 : 5);
          if (audioRef.current) {
            audioRef.current.currentTime = (currentTime - (e.shiftKey ? 10000 : 5000)) / 1000;
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward(e.shiftKey ? 10 : 5);
          if (audioRef.current) {
            audioRef.current.currentTime = (currentTime + (e.shiftKey ? 10000 : 5000)) / 1000;
          }
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 's':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (unsavedChanges) saveChanges();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingSegmentId,
    togglePlayPause,
    skipBackward,
    skipForward,
    toggleMute,
    unsavedChanges,
    saveChanges,
    currentTime,
  ]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Loading transcript...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="mt-4 text-lg font-medium">Failed to load transcript</p>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  if (!transcript) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No transcript available</p>
        <p className="mt-2 text-muted-foreground">
          This recording hasn&apos;t been transcribed yet.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={mediaUrl || undefined}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="metadata"
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold">{recording?.name || 'Transcript'}</h1>
            <p className="text-xs text-muted-foreground">
              {transcript.segments.length} segments &middot; {transcript.speakers.length} speakers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unsavedChanges && (
            <>
              <Button variant="ghost" size="sm" onClick={discardChanges}>
                <Undo2 className="mr-2 h-4 w-4" />
                Discard
              </Button>
              <Button size="sm" onClick={saveChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowExportDialog(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            recordingId={recordingId || ''}
            recordingName={recording?.name || 'transcript'}
          />
          <Button variant="ghost" size="icon">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Media Player */}
      <Card className="mx-6 mt-4">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Playback controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  skipBackward(5);
                  if (audioRef.current) audioRef.current.currentTime -= 5;
                }}
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="default" size="icon" className="h-10 w-10" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  skipForward(5);
                  if (audioRef.current) audioRef.current.currentTime += 5;
                }}
              >
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>

            {/* Time display */}
            <div className="text-sm tabular-nums text-muted-foreground min-w-[100px]">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* Progress bar */}
            <div className="flex-1">
              <Slider
                value={[currentTime]}
                min={0}
                max={duration || 100}
                step={100}
                onValueChange={([value]) => value !== undefined && handleSeek(value)}
                className="cursor-pointer"
              />
            </div>

            {/* Speed control */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-sm bg-transparent border rounded px-2 py-1"
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>

            {/* Volume */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => value !== undefined && setVolume(value / 100)}
                className="w-24"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden p-6">
        {/* Transcript */}
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Transcript
            </h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
          </div>

          <div ref={transcriptRef} className="h-full overflow-y-auto space-y-2 pr-2">
            {transcript.segments.map((segment, index) => (
              <div key={segment.id} data-segment-index={index}>
                <Segment
                  segment={segment}
                  speakers={transcript.speakers}
                  isActive={index === activeSegmentIndex}
                  isEditing={segment.id === editingSegmentId}
                  onSeek={() => {
                    seekToSegment(index);
                    if (audioRef.current) {
                      audioRef.current.currentTime = segment.startTime / 1000;
                    }
                  }}
                  onStartEdit={() => startEditing(segment.id)}
                  onTextChange={(text) => updateSegmentText(segment.id, text)}
                  onStopEdit={stopEditing}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Speakers Panel */}
        <div className={`${showSpeakers ? 'w-64' : 'w-10'} transition-all`}>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between mb-2"
            onClick={() => setShowSpeakers(!showSpeakers)}
          >
            {showSpeakers && (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Speakers
              </span>
            )}
            {showSpeakers ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showSpeakers && (
            <div className="space-y-2">
              {transcript.speakers.map((speaker) => {
                const segmentCount = transcript.segments.filter(
                  (s) => s.speakerId === speaker.id
                ).length;
                const totalTime = transcript.segments
                  .filter((s) => s.speakerId === speaker.id)
                  .reduce((sum, s) => sum + (s.endTime - s.startTime), 0);

                return (
                  <Card key={speaker.id}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className={`h-6 w-6 rounded-full ${getSpeakerColor(speaker.id, transcript.speakers)} flex items-center justify-center text-white text-xs font-medium`}
                        >
                          {(speaker.name || speaker.id).charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">
                          {speaker.name || speaker.id.replace('speaker_', 'Speaker ')}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>{segmentCount} segments</p>
                        <p>{formatTime(totalTime)} speaking time</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
