import * as React from 'react';
import { Mic, MicOff, Pause, Square } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { MiniWaveform } from '../transcript/waveform';

interface RecordingIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'idle' | 'recording' | 'paused';
  duration?: number;
  audioLevels?: number[];
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const RecordingIndicator = React.forwardRef<HTMLDivElement, RecordingIndicatorProps>(
  (
    {
      className,
      status,
      duration = 0,
      audioLevels = [],
      onStart,
      onPause,
      onResume,
      onStop,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-4 rounded-lg border p-4',
          status === 'recording' && 'border-red-500 bg-red-500/10',
          status === 'paused' && 'border-yellow-500 bg-yellow-500/10',
          className
        )}
        {...props}
      >
        {/* Recording indicator dot */}
        {status === 'recording' && (
          <span className="h-3 w-3 animate-pulse-recording rounded-full bg-red-500" />
        )}
        {status === 'paused' && <span className="h-3 w-3 rounded-full bg-yellow-500" />}

        {/* Duration */}
        <span className="min-w-[80px] font-mono text-lg">{formatDuration(duration)}</span>

        {/* Audio levels */}
        {status !== 'idle' && (
          <MiniWaveform levels={audioLevels} isRecording={status === 'recording'} />
        )}

        {/* Controls */}
        <div className="ml-auto flex items-center gap-2">
          {status === 'idle' && (
            <Button onClick={onStart} variant="default" className="gap-2">
              <Mic className="h-4 w-4" />
              Start Recording
            </Button>
          )}

          {status === 'recording' && (
            <>
              <Button onClick={onPause} variant="outline" size="icon">
                <Pause className="h-4 w-4" />
              </Button>
              <Button onClick={onStop} variant="destructive" size="icon">
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}

          {status === 'paused' && (
            <>
              <Button onClick={onResume} variant="default" className="gap-2">
                <Mic className="h-4 w-4" />
                Resume
              </Button>
              <Button onClick={onStop} variant="destructive" size="icon">
                <Square className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }
);
RecordingIndicator.displayName = 'RecordingIndicator';

interface RecordingStatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'idle' | 'recording' | 'paused';
}

const RecordingStatusBadge = React.forwardRef<HTMLDivElement, RecordingStatusBadgeProps>(
  ({ className, status, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        status === 'recording' && 'bg-red-500/10 text-red-500',
        status === 'paused' && 'bg-yellow-500/10 text-yellow-500',
        status === 'idle' && 'bg-muted text-muted-foreground',
        className
      )}
      {...props}
    >
      {status === 'recording' && (
        <>
          <span className="h-1.5 w-1.5 animate-pulse-recording rounded-full bg-current" />
          Recording
        </>
      )}
      {status === 'paused' && (
        <>
          <MicOff className="h-3 w-3" />
          Paused
        </>
      )}
      {status === 'idle' && (
        <>
          <Mic className="h-3 w-3" />
          Ready
        </>
      )}
    </div>
  )
);
RecordingStatusBadge.displayName = 'RecordingStatusBadge';

export { RecordingIndicator, RecordingStatusBadge };
