/**
 * Time utilities
 */

import type { Duration, Timestamp } from '../types/common';

/**
 * Parse duration string to milliseconds
 * Supports formats: "HH:MM:SS", "MM:SS", "SS", "HH:MM:SS,mmm"
 */
export function parseDuration(input: string): Duration {
  // Handle SRT/VTT format with milliseconds
  const splitResult = input.split(/[,\.]/);
  const timePart = splitResult[0] ?? '';
  const msPart = splitResult[1];
  const parts = timePart.split(':').map(Number);

  let ms = 0;

  if (parts.length === 3) {
    // HH:MM:SS
    const hours = parts[0] ?? 0;
    const minutes = parts[1] ?? 0;
    const seconds = parts[2] ?? 0;
    ms = hours * 3600000 + minutes * 60000 + seconds * 1000;
  } else if (parts.length === 2) {
    // MM:SS
    const minutes = parts[0] ?? 0;
    const seconds = parts[1] ?? 0;
    ms = minutes * 60000 + seconds * 1000;
  } else if (parts.length === 1) {
    // SS
    const seconds = parts[0] ?? 0;
    ms = seconds * 1000;
  }

  if (msPart) {
    ms += parseInt(msPart.padEnd(3, '0').slice(0, 3), 10);
  }

  return ms;
}

/**
 * Convert seconds to milliseconds
 */
export function secondsToMs(seconds: number): Duration {
  return Math.round(seconds * 1000);
}

/**
 * Convert milliseconds to seconds
 */
export function msToSeconds(ms: Duration): number {
  return ms / 1000;
}

/**
 * Get current timestamp in ISO 8601 format
 */
export function now(): Timestamp {
  return new Date().toISOString();
}

/**
 * Check if timestamp is in the past
 */
export function isPast(timestamp: Timestamp): boolean {
  return new Date(timestamp) < new Date();
}

/**
 * Check if timestamp is in the future
 */
export function isFuture(timestamp: Timestamp): boolean {
  return new Date(timestamp) > new Date();
}

/**
 * Calculate duration between two timestamps
 */
export function durationBetween(start: Timestamp, end: Timestamp): Duration {
  return new Date(end).getTime() - new Date(start).getTime();
}

/**
 * Add duration to timestamp
 */
export function addDuration(timestamp: Timestamp, duration: Duration): Timestamp {
  return new Date(new Date(timestamp).getTime() + duration).toISOString();
}

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(timestamp: Timestamp): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const isFuture = diff < 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (days > 0) {
    return `${prefix}${days} day${days > 1 ? 's' : ''}${suffix}`;
  }
  if (hours > 0) {
    return `${prefix}${hours} hour${hours > 1 ? 's' : ''}${suffix}`;
  }
  if (minutes > 0) {
    return `${prefix}${minutes} minute${minutes > 1 ? 's' : ''}${suffix}`;
  }
  return 'just now';
}
