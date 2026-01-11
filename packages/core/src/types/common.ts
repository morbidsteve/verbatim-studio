/**
 * Common types used throughout the application
 */

export type UUID = string;

export type Timestamp = string; // ISO 8601

export type Duration = number; // milliseconds

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams {
  field: string;
  direction: SortDirection;
}

export interface DateRange {
  start: Timestamp;
  end: Timestamp;
}

export type Status = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
