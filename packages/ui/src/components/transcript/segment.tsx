import * as React from 'react';
import { cn } from '../../lib/utils';

interface TranscriptSegmentProps extends React.HTMLAttributes<HTMLDivElement> {
  speakerName?: string;
  speakerColor?: string;
  timestamp?: string;
  text: string;
  confidence?: number;
  isActive?: boolean;
  isEditing?: boolean;
  onTimestampClick?: () => void;
  onTextChange?: (text: string) => void;
}

const TranscriptSegment = React.forwardRef<HTMLDivElement, TranscriptSegmentProps>(
  (
    {
      className,
      speakerName,
      speakerColor = '#3B82F6',
      timestamp,
      text,
      confidence,
      isActive,
      isEditing,
      onTimestampClick,
      onTextChange,
      ...props
    },
    ref
  ) => {
    const [editedText, setEditedText] = React.useState(text);

    const handleBlur = () => {
      if (onTextChange && editedText !== text) {
        onTextChange(editedText);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'group flex gap-4 rounded-md p-3 transition-colors',
          isActive && 'bg-accent',
          !isActive && 'hover:bg-muted/50',
          className
        )}
        {...props}
      >
        {/* Timestamp */}
        {timestamp && (
          <button
            type="button"
            onClick={onTimestampClick}
            className="flex-shrink-0 font-mono text-xs text-muted-foreground hover:text-foreground"
          >
            {timestamp}
          </button>
        )}

        {/* Content */}
        <div className="flex-1 space-y-1">
          {/* Speaker label */}
          {speakerName && (
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: speakerColor }}
              />
              <span className="text-sm font-medium">{speakerName}</span>
            </div>
          )}

          {/* Text */}
          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              onBlur={handleBlur}
              className="w-full resize-none rounded border border-input bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
            />
          ) : (
            <p
              className={cn(
                'text-sm leading-relaxed',
                confidence !== undefined && confidence < 0.7 && 'text-muted-foreground'
              )}
            >
              {text}
            </p>
          )}
        </div>

        {/* Confidence indicator */}
        {confidence !== undefined && confidence < 0.7 && (
          <div className="flex-shrink-0">
            <span
              className="text-xs text-yellow-500"
              title={`Confidence: ${Math.round(confidence * 100)}%`}
            >
              Low confidence
            </span>
          </div>
        )}
      </div>
    );
  }
);
TranscriptSegment.displayName = 'TranscriptSegment';

export { TranscriptSegment };
