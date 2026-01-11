import * as React from 'react';
import { cn } from '../../lib/utils';

interface SpeakerBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string;
  color?: string;
  isActive?: boolean;
  speakingTime?: string;
  onEdit?: () => void;
}

const SpeakerBadge = React.forwardRef<HTMLDivElement, SpeakerBadgeProps>(
  ({ className, name, color = '#3B82F6', isActive, speakingTime, onEdit, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors',
        isActive && 'ring-2 ring-ring ring-offset-2',
        className
      )}
      style={{ borderColor: color }}
      {...props}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium">{name}</span>
      {speakingTime && <span className="text-xs text-muted-foreground">{speakingTime}</span>}
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="ml-1 text-muted-foreground hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      )}
    </div>
  )
);
SpeakerBadge.displayName = 'SpeakerBadge';

interface SpeakerListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const SpeakerList = React.forwardRef<HTMLDivElement, SpeakerListProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  )
);
SpeakerList.displayName = 'SpeakerList';

export { SpeakerBadge, SpeakerList };
