import * as React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';

interface AudioPlayerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onVolumeChange'> {
  currentTime?: number;
  duration?: number;
  isPlaying?: boolean;
  volume?: number;
  isMuted?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeek?: (time: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onVolumeChange?: (volume: number) => void;
  onMuteToggle?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const AudioPlayer = React.forwardRef<HTMLDivElement, AudioPlayerProps>(
  (
    {
      className,
      currentTime = 0,
      duration = 0,
      isPlaying = false,
      volume = 1,
      isMuted = false,
      onPlay,
      onPause,
      onSeek,
      onSkipBack,
      onSkipForward,
      onVolumeChange,
      onMuteToggle,
      ...props
    },
    ref
  ) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    const handleSeek = (value: number[]) => {
      const seekValue = value[0];
      if (onSeek && duration > 0 && seekValue !== undefined) {
        onSeek((seekValue / 100) * duration);
      }
    };

    const handleVolumeChange = (value: number[]) => {
      const volumeValue = value[0];
      if (onVolumeChange && volumeValue !== undefined) {
        onVolumeChange(volumeValue / 100);
      }
    };

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-4 rounded-lg border bg-card p-4', className)}
        {...props}
      >
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onSkipBack}>
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="default"
            size="icon"
            className="h-10 w-10"
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </Button>

          <Button variant="ghost" size="icon" onClick={onSkipForward}>
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Time display */}
        <span className="min-w-[80px] text-sm text-muted-foreground">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Progress slider */}
        <div className="flex-1">
          <Slider
            value={[progress]}
            max={100}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onMuteToggle}>
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
          <div className="w-20">
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
      </div>
    );
  }
);
AudioPlayer.displayName = 'AudioPlayer';

export { AudioPlayer };
