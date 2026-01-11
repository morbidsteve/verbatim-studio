/**
 * Storage factory for creating storage instances.
 */

import type { Storage, StorageConfig, LocalStorageConfig, S3StorageConfig } from './types';
import { LocalStorage } from './local';
import { S3Storage } from './s3';

/**
 * Create a storage instance based on configuration.
 */
export function createStorage(config: StorageConfig): Storage {
  switch (config.provider) {
    case 'local':
      return new LocalStorage(config as LocalStorageConfig);
    case 's3':
      return new S3Storage(config as S3StorageConfig);
    default:
      throw new Error(`Unknown storage provider: ${(config as StorageConfig).provider}`);
  }
}

/**
 * Create a local storage instance.
 */
export function createLocalStorage(basePath: string, options?: Partial<LocalStorageConfig>): Storage {
  return new LocalStorage({
    provider: 'local',
    basePath,
    ...options,
  });
}

/**
 * Create an S3 storage instance.
 */
export function createS3Storage(
  bucket: string,
  region: string,
  options?: Partial<Omit<S3StorageConfig, 'provider' | 'bucket' | 'region'>>
): Storage {
  return new S3Storage({
    provider: 's3',
    bucket,
    region,
    ...options,
  });
}

/**
 * Storage paths helper.
 *
 * Generates consistent paths for different file types.
 */
export const storagePaths = {
  /**
   * Get path for a recording file.
   */
  recording(projectId: string, recordingId: string, filename: string): string {
    return `projects/${projectId}/recordings/${recordingId}/${filename}`;
  },

  /**
   * Get path for an export file.
   */
  export(projectId: string, recordingId: string, exportId: string, filename: string): string {
    return `projects/${projectId}/recordings/${recordingId}/exports/${exportId}/${filename}`;
  },

  /**
   * Get path for a speaker avatar.
   */
  speakerAvatar(profileId: string, filename: string): string {
    return `speakers/${profileId}/${filename}`;
  },

  /**
   * Get path for a speaker voice signature.
   */
  speakerVoiceSignature(profileId: string): string {
    return `speakers/${profileId}/voice_signature.bin`;
  },

  /**
   * Get path for temporary files.
   */
  temp(filename: string): string {
    return `temp/${filename}`;
  },

  /**
   * Get path for backups.
   */
  backup(filename: string): string {
    return `backups/${filename}`;
  },
};
