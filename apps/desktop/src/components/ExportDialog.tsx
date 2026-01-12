/**
 * Export dialog for transcripts with format selection and options.
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Label,
  Switch,
} from '@verbatim/ui';
import {
  FileText,
  FileJson,
  Subtitles,
  FileType2,
  FileDown,
  Loader2,
  Check,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  recordingName: string;
}

type ExportFormat = 'txt' | 'json' | 'srt' | 'vtt' | 'docx' | 'pdf';

interface FormatOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
  extension: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'txt',
    label: 'Plain Text',
    description: 'Simple text format for easy reading',
    icon: <FileText className="h-5 w-5" />,
    extension: '.txt',
  },
  {
    id: 'docx',
    label: 'Word Document',
    description: 'Formatted document with speaker labels',
    icon: <FileType2 className="h-5 w-5" />,
    extension: '.docx',
  },
  {
    id: 'pdf',
    label: 'PDF',
    description: 'Portable document for sharing',
    icon: <FileDown className="h-5 w-5" />,
    extension: '.pdf',
  },
  {
    id: 'srt',
    label: 'SRT Subtitles',
    description: 'Standard subtitle format for video players',
    icon: <Subtitles className="h-5 w-5" />,
    extension: '.srt',
  },
  {
    id: 'vtt',
    label: 'WebVTT',
    description: 'Web subtitle format with styling support',
    icon: <Subtitles className="h-5 w-5" />,
    extension: '.vtt',
  },
  {
    id: 'json',
    label: 'JSON',
    description: 'Structured data with all metadata',
    icon: <FileJson className="h-5 w-5" />,
    extension: '.json',
  },
];

export function ExportDialog({
  open,
  onOpenChange,
  recordingId,
  recordingName,
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('docx');
  const [includeSpeakers, setIncludeSpeakers] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setExportSuccess(false);

    try {
      const blob = await apiClient.exportTranscript(recordingId, {
        format: selectedFormat,
        include_speaker_labels: includeSpeakers,
        include_timestamps: includeTimestamps,
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recordingName}${FORMAT_OPTIONS.find((f) => f.id === selectedFormat)?.extension || '.txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setExportSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const showOptions = selectedFormat !== 'json';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Transcript</DialogTitle>
          <DialogDescription>
            Choose a format and options for your export.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Format</Label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    selectedFormat === format.id
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-muted-foreground/50'
                  }`}
                >
                  <div
                    className={`${selectedFormat === format.id ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {format.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{format.label}</div>
                    <div className="text-xs text-muted-foreground">{format.extension}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          {showOptions && (
            <div className="space-y-3 pt-2 border-t">
              <Label>Options</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Include speaker labels</div>
                    <div className="text-xs text-muted-foreground">
                      Show who said what
                    </div>
                  </div>
                  <Switch checked={includeSpeakers} onCheckedChange={setIncludeSpeakers} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">Include timestamps</div>
                    <div className="text-xs text-muted-foreground">
                      Show when each segment starts
                    </div>
                  </div>
                  <Switch checked={includeTimestamps} onCheckedChange={setIncludeTimestamps} />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting || exportSuccess}>
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : exportSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Done!
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
