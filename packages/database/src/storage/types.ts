/**
 * Storage types and interfaces.
 */

import { Readable } from 'stream';

/**
 * Storage provider type.
 */
export type StorageProvider = 'local' | 's3';

/**
 * File metadata.
 */
export interface FileMetadata {
  /** File path/key in storage */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  contentType?: string;
  /** Last modified timestamp */
  lastModified: Date;
  /** MD5/ETag hash */
  hash?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
}

/**
 * Upload options.
 */
export interface UploadOptions {
  /** MIME type */
  contentType?: string;
  /** Custom metadata */
  metadata?: Record<string, string>;
  /** Enable encryption (for S3) */
  encrypt?: boolean;
  /** Storage class (for S3) */
  storageClass?: 'STANDARD' | 'STANDARD_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
}

/**
 * Download options.
 */
export interface DownloadOptions {
  /** Byte range start */
  rangeStart?: number;
  /** Byte range end */
  rangeEnd?: number;
}

/**
 * Signed URL options.
 */
export interface SignedUrlOptions {
  /** URL expiration in seconds */
  expiresIn?: number;
  /** Response content type */
  responseContentType?: string;
  /** Response content disposition */
  responseContentDisposition?: string;
}

/**
 * List options.
 */
export interface ListOptions {
  /** Prefix to filter by */
  prefix?: string;
  /** Continuation token for pagination */
  continuationToken?: string;
  /** Maximum number of results */
  maxKeys?: number;
  /** Delimiter for hierarchical listing */
  delimiter?: string;
}

/**
 * List result.
 */
export interface ListResult {
  /** Files found */
  files: FileMetadata[];
  /** Common prefixes (folders) */
  prefixes: string[];
  /** Continuation token for next page */
  continuationToken?: string;
  /** Whether there are more results */
  isTruncated: boolean;
}

/**
 * Copy options.
 */
export interface CopyOptions {
  /** Overwrite if exists */
  overwrite?: boolean;
  /** Update metadata */
  metadata?: Record<string, string>;
}

/**
 * Storage interface.
 */
export interface Storage {
  /** Provider type */
  readonly provider: StorageProvider;

  /**
   * Upload a file from a buffer.
   */
  upload(path: string, data: Buffer, options?: UploadOptions): Promise<FileMetadata>;

  /**
   * Upload a file from a stream.
   */
  uploadStream(
    path: string,
    stream: Readable,
    size: number,
    options?: UploadOptions
  ): Promise<FileMetadata>;

  /**
   * Upload a file from the local filesystem.
   */
  uploadFile(localPath: string, remotePath: string, options?: UploadOptions): Promise<FileMetadata>;

  /**
   * Download a file to a buffer.
   */
  download(path: string, options?: DownloadOptions): Promise<Buffer>;

  /**
   * Download a file as a stream.
   */
  downloadStream(path: string, options?: DownloadOptions): Promise<Readable>;

  /**
   * Download a file to the local filesystem.
   */
  downloadFile(remotePath: string, localPath: string, options?: DownloadOptions): Promise<void>;

  /**
   * Check if a file exists.
   */
  exists(path: string): Promise<boolean>;

  /**
   * Get file metadata.
   */
  getMetadata(path: string): Promise<FileMetadata>;

  /**
   * Delete a file.
   */
  delete(path: string): Promise<void>;

  /**
   * Delete multiple files.
   */
  deleteMany(paths: string[]): Promise<void>;

  /**
   * Copy a file.
   */
  copy(sourcePath: string, destPath: string, options?: CopyOptions): Promise<FileMetadata>;

  /**
   * Move a file.
   */
  move(sourcePath: string, destPath: string, options?: CopyOptions): Promise<FileMetadata>;

  /**
   * List files.
   */
  list(options?: ListOptions): Promise<ListResult>;

  /**
   * Get a signed URL for downloading (S3 only, local returns direct path).
   */
  getSignedUrl(path: string, options?: SignedUrlOptions): Promise<string>;

  /**
   * Get a signed URL for uploading (S3 only).
   */
  getSignedUploadUrl(path: string, options?: SignedUrlOptions): Promise<string>;
}

/**
 * Storage configuration.
 */
export interface LocalStorageConfig {
  provider: 'local';
  /** Base directory for file storage */
  basePath: string;
  /** Enable file encryption */
  encrypt?: boolean;
  /** Encryption key (required if encrypt is true) */
  encryptionKey?: string;
}

export interface S3StorageConfig {
  provider: 's3';
  /** S3 bucket name */
  bucket: string;
  /** AWS region */
  region: string;
  /** Optional endpoint for S3-compatible services */
  endpoint?: string;
  /** AWS access key ID */
  accessKeyId?: string;
  /** AWS secret access key */
  secretAccessKey?: string;
  /** Enable server-side encryption */
  encrypt?: boolean;
  /** Path prefix within bucket */
  prefix?: string;
  /** Force path style (for MinIO, etc.) */
  forcePathStyle?: boolean;
}

export type StorageConfig = LocalStorageConfig | S3StorageConfig;
