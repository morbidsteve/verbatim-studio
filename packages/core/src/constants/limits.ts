/**
 * Application limits and constraints
 */

// File size limits
export const MAX_FILE_SIZE_BASIC = 2 * 1024 * 1024 * 1024; // 2GB
export const MAX_FILE_SIZE_ENTERPRISE = 10 * 1024 * 1024 * 1024; // 10GB

// Recording limits
export const MAX_RECORDING_DURATION_BASIC = 4 * 60 * 60 * 1000; // 4 hours in ms
export const MAX_RECORDING_DURATION_ENTERPRISE = 24 * 60 * 60 * 1000; // 24 hours in ms

// Project limits
export const MAX_PROJECTS_BASIC = 100;
export const MAX_PROJECTS_ENTERPRISE = -1; // Unlimited

export const MAX_RECORDINGS_PER_PROJECT = 1000;

// Speaker limits
export const MAX_SPEAKERS_PER_RECORDING = 20;
export const MAX_SPEAKER_PROFILES = 100;

// Upload limits
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_CONCURRENT_UPLOADS = 3;

// Queue limits
export const MAX_QUEUE_SIZE_BASIC = 10;
export const MAX_QUEUE_SIZE_ENTERPRISE = 100;

// Search limits
export const MAX_SEARCH_RESULTS = 100;
export const SEMANTIC_SEARCH_THRESHOLD = 0.7;

// Chat limits
export const MAX_CHAT_HISTORY = 50;
export const MAX_CHAT_CONTEXT_TOKENS = 4096;

// Export limits
export const MAX_BATCH_EXPORT = 50;

// Retention
export const DEFAULT_RETENTION_DAYS = 365;
export const MIN_RETENTION_DAYS = 30;
export const MAX_RETENTION_DAYS = 3650; // 10 years

// Real-time
export const REAL_TIME_BUFFER_SIZE = 4096;
export const REAL_TIME_FLUSH_INTERVAL_MS = 100;

// API rate limits
export const API_RATE_LIMIT_BASIC = 100; // requests per minute
export const API_RATE_LIMIT_ENTERPRISE = 1000;

// Collaboration limits (Enterprise)
export const MAX_COLLABORATORS_PER_PROJECT = 50;
export const MAX_CONCURRENT_EDITORS = 10;

// Workspace limits
export const MAX_WORKSPACES_PER_ORG = 50;
export const MAX_MEMBERS_PER_WORKSPACE = 100;
