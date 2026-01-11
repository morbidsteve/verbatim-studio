/**
 * File storage abstraction layer.
 *
 * Provides a unified interface for storing and retrieving files,
 * with implementations for local filesystem and S3-compatible storage.
 */

export * from './types';
export * from './local';
export * from './s3';
export * from './factory';
