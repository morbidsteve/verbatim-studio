/**
 * Transcript export utilities.
 */

import type { TranscriptionResult } from '../types/transcription';

export type ExportFormat = 'json' | 'txt' | 'srt' | 'vtt';

/**
 * Format duration in milliseconds to SRT format (HH:MM:SS,mmm).
 */
function formatSrtTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
}

/**
 * Format duration in milliseconds to VTT format (HH:MM:SS.mmm).
 */
function formatVttTime(ms: number): string {
  return formatSrtTime(ms).replace(',', '.');
}

/**
 * Export transcription to plain text.
 */
export function exportToText(result: TranscriptionResult): string {
  return result.text;
}

/**
 * Export transcription to SRT subtitle format.
 */
export function exportToSrt(result: TranscriptionResult): string {
  const lines: string[] = [];

  result.segments.forEach((segment, index) => {
    const startMs = segment.start * 1000;
    const endMs = segment.end * 1000;

    lines.push(String(index + 1));
    lines.push(`${formatSrtTime(startMs)} --> ${formatSrtTime(endMs)}`);

    // Add speaker label if present
    if (segment.speaker) {
      lines.push(`[${segment.speaker}] ${segment.text}`);
    } else {
      lines.push(segment.text);
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Export transcription to WebVTT subtitle format.
 */
export function exportToVtt(result: TranscriptionResult): string {
  const lines: string[] = ['WEBVTT', ''];

  result.segments.forEach((segment, index) => {
    const startMs = segment.start * 1000;
    const endMs = segment.end * 1000;

    lines.push(`${index + 1}`);
    lines.push(`${formatVttTime(startMs)} --> ${formatVttTime(endMs)}`);

    if (segment.speaker) {
      lines.push(`<v ${segment.speaker}>${segment.text}`);
    } else {
      lines.push(segment.text);
    }

    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Export transcription to JSON.
 */
export function exportToJson(result: TranscriptionResult): string {
  return JSON.stringify(result, null, 2);
}

/**
 * Export transcription to the specified format.
 */
export function exportTranscript(result: TranscriptionResult, format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return exportToText(result);
    case 'srt':
      return exportToSrt(result);
    case 'vtt':
      return exportToVtt(result);
    case 'json':
    default:
      return exportToJson(result);
  }
}

/**
 * Get the MIME type for an export format.
 */
export function getExportMimeType(format: ExportFormat): string {
  switch (format) {
    case 'txt':
      return 'text/plain';
    case 'srt':
      return 'application/x-subrip';
    case 'vtt':
      return 'text/vtt';
    case 'json':
    default:
      return 'application/json';
  }
}

/**
 * Get the file extension for an export format.
 */
export function getExportExtension(format: ExportFormat): string {
  return `.${format}`;
}
