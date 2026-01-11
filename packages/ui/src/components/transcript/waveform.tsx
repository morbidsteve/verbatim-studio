import * as React from 'react';
import { cn } from '../../lib/utils';

interface WaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  progress?: number;
  duration?: number;
  peaks?: number[];
  onSeek?: (progress: number) => void;
}

const Waveform = React.forwardRef<HTMLDivElement, WaveformProps>(
  ({ className, progress = 0, duration = 0, peaks = [], onSeek, ...props }, ref) => {
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef.current || !onSeek) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickProgress = (e.clientX - rect.left) / rect.width;
      onSeek(Math.max(0, Math.min(1, clickProgress)));
    };

    // Generate placeholder peaks if none provided
    const displayPeaks =
      peaks.length > 0
        ? peaks
        : Array.from({ length: 100 }, () => Math.random() * 0.5 + 0.25);

    return (
      <div
        ref={ref}
        className={cn('relative h-16 w-full cursor-pointer rounded-md bg-muted', className)}
        onClick={handleClick}
        {...props}
      >
        <div ref={containerRef} className="absolute inset-0 flex items-center gap-[1px] px-2">
          {displayPeaks.map((peak, index) => {
            const isPlayed = index / displayPeaks.length <= progress;
            return (
              <div
                key={index}
                className={cn(
                  'flex-1 rounded-full transition-colors',
                  isPlayed ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
                style={{ height: `${Math.max(peak * 100, 4)}%` }}
              />
            );
          })}
        </div>

        {/* Progress indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-primary"
          style={{ left: `${progress * 100}%` }}
        />
      </div>
    );
  }
);
Waveform.displayName = 'Waveform';

interface MiniWaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  levels?: number[];
  isRecording?: boolean;
}

const MiniWaveform = React.forwardRef<HTMLDivElement, MiniWaveformProps>(
  ({ className, levels = [], isRecording = false, ...props }, ref) => {
    const displayLevels = levels.length > 0 ? levels : Array(5).fill(0.2);

    return (
      <div
        ref={ref}
        className={cn('flex h-6 items-center gap-0.5', className)}
        {...props}
      >
        {displayLevels.slice(-10).map((level, index) => (
          <div
            key={index}
            className={cn(
              'w-1 rounded-full transition-all duration-100',
              isRecording ? 'bg-red-500' : 'bg-primary'
            )}
            style={{ height: `${Math.max(level * 100, 10)}%` }}
          />
        ))}
      </div>
    );
  }
);
MiniWaveform.displayName = 'MiniWaveform';

export { Waveform, MiniWaveform };
