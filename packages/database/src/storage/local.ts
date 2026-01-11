/**
 * Local filesystem storage implementation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import * as crypto from 'crypto';

import type {
  Storage,
  LocalStorageConfig,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
  CopyOptions,
  SignedUrlOptions,
} from './types';

/**
 * Local filesystem storage implementation.
 */
export class LocalStorage implements Storage {
  readonly provider = 'local' as const;

  private basePath: string;
  private encrypt: boolean;
  private encryptionKey?: Buffer;

  constructor(config: LocalStorageConfig) {
    this.basePath = config.basePath;
    this.encrypt = config.encrypt ?? false;

    if (this.encrypt) {
      if (!config.encryptionKey) {
        throw new Error('Encryption key required when encryption is enabled');
      }
      // Derive a 32-byte key from the provided key
      this.encryptionKey = crypto.scryptSync(config.encryptionKey, 'salt', 32);
    }

    // Ensure base directory exists
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  private getFullPath(relativePath: string): string {
    // Prevent path traversal attacks
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.basePath, normalized);
  }

  private ensureDir(filePath: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  private encryptData(data: Buffer): Buffer {
    if (!this.encrypt || !this.encryptionKey) return data;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: IV (16) + AuthTag (16) + EncryptedData
    return Buffer.concat([iv, authTag, encrypted]);
  }

  private decryptData(data: Buffer): Buffer {
    if (!this.encrypt || !this.encryptionKey) return data;

    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private computeHash(data: Buffer): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  async upload(filePath: string, data: Buffer, options?: UploadOptions): Promise<FileMetadata> {
    const fullPath = this.getFullPath(filePath);
    this.ensureDir(fullPath);

    const encrypted = this.encryptData(data);
    await fs.promises.writeFile(fullPath, encrypted);

    // Write metadata if provided
    if (options?.metadata || options?.contentType) {
      const metaPath = `${fullPath}.meta`;
      await fs.promises.writeFile(
        metaPath,
        JSON.stringify({
          contentType: options?.contentType,
          metadata: options?.metadata,
        })
      );
    }

    const stats = await fs.promises.stat(fullPath);

    return {
      path: filePath,
      size: data.length, // Original size, not encrypted
      contentType: options?.contentType,
      lastModified: stats.mtime,
      hash: this.computeHash(data),
      metadata: options?.metadata,
    };
  }

  async uploadStream(
    filePath: string,
    stream: Readable,
    _size: number,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    // For local storage, we buffer the stream for encryption
    // In production, consider streaming encryption
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);
    return this.upload(filePath, data, options);
  }

  async uploadFile(
    localPath: string,
    remotePath: string,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    const data = await fs.promises.readFile(localPath);
    return this.upload(remotePath, data, options);
  }

  async download(filePath: string, _options?: DownloadOptions): Promise<Buffer> {
    const fullPath = this.getFullPath(filePath);
    const encrypted = await fs.promises.readFile(fullPath);
    return this.decryptData(encrypted);
  }

  async downloadStream(filePath: string, options?: DownloadOptions): Promise<Readable> {
    const data = await this.download(filePath, options);
    return Readable.from(data);
  }

  async downloadFile(
    remotePath: string,
    localPath: string,
    options?: DownloadOptions
  ): Promise<void> {
    const data = await this.download(remotePath, options);
    await fs.promises.writeFile(localPath, data);
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.getFullPath(filePath);
    try {
      await fs.promises.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const fullPath = this.getFullPath(filePath);
    const stats = await fs.promises.stat(fullPath);

    let contentType: string | undefined;
    let metadata: Record<string, string> | undefined;

    // Try to read metadata file
    const metaPath = `${fullPath}.meta`;
    try {
      const metaData = await fs.promises.readFile(metaPath, 'utf8');
      const meta = JSON.parse(metaData);
      contentType = meta.contentType;
      metadata = meta.metadata;
    } catch {
      // No metadata file
    }

    // If encrypted, we need to read to get actual size
    let size = stats.size;
    if (this.encrypt) {
      const data = await this.download(filePath);
      size = data.length;
    }

    return {
      path: filePath,
      size,
      contentType,
      lastModified: stats.mtime,
      metadata,
    };
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.promises.unlink(fullPath);

    // Try to delete metadata file
    try {
      await fs.promises.unlink(`${fullPath}.meta`);
    } catch {
      // Ignore if doesn't exist
    }
  }

  async deleteMany(paths: string[]): Promise<void> {
    await Promise.all(paths.map((p) => this.delete(p)));
  }

  async copy(
    sourcePath: string,
    destPath: string,
    options?: CopyOptions
  ): Promise<FileMetadata> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const destFullPath = this.getFullPath(destPath);

    // Check if dest exists
    if (!options?.overwrite) {
      try {
        await fs.promises.access(destFullPath);
        throw new Error(`File already exists: ${destPath}`);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      }
    }

    this.ensureDir(destFullPath);
    await fs.promises.copyFile(sourceFullPath, destFullPath);

    // Copy or update metadata
    const metaPath = `${sourceFullPath}.meta`;
    const destMetaPath = `${destFullPath}.meta`;
    try {
      if (options?.metadata) {
        const srcMeta = JSON.parse(await fs.promises.readFile(metaPath, 'utf8'));
        await fs.promises.writeFile(
          destMetaPath,
          JSON.stringify({ ...srcMeta, metadata: options.metadata })
        );
      } else {
        await fs.promises.copyFile(metaPath, destMetaPath);
      }
    } catch {
      // Source has no metadata
      if (options?.metadata) {
        await fs.promises.writeFile(destMetaPath, JSON.stringify({ metadata: options.metadata }));
      }
    }

    return this.getMetadata(destPath);
  }

  async move(
    sourcePath: string,
    destPath: string,
    options?: CopyOptions
  ): Promise<FileMetadata> {
    const metadata = await this.copy(sourcePath, destPath, options);
    await this.delete(sourcePath);
    return metadata;
  }

  async list(options?: ListOptions): Promise<ListResult> {
    const prefix = options?.prefix ?? '';
    const delimiter = options?.delimiter;
    const maxKeys = options?.maxKeys ?? 1000;

    const searchPath = this.getFullPath(prefix);
    const files: FileMetadata[] = [];
    const prefixes: Set<string> = new Set();

    const walkDir = async (dir: string, relativePath: string): Promise<void> => {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        // Skip metadata files
        if (entry.name.endsWith('.meta')) continue;

        const entryRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
          if (delimiter) {
            // Return as prefix instead of recursing
            prefixes.add(entryRelativePath + delimiter);
          } else {
            await walkDir(path.join(dir, entry.name), entryRelativePath);
          }
        } else if (entry.isFile()) {
          if (files.length >= maxKeys) return;

          const stats = await fs.promises.stat(path.join(dir, entry.name));
          files.push({
            path: entryRelativePath,
            size: stats.size,
            lastModified: stats.mtime,
          });
        }
      }
    };

    await walkDir(searchPath, prefix);

    return {
      files,
      prefixes: Array.from(prefixes),
      isTruncated: files.length >= maxKeys,
    };
  }

  async getSignedUrl(filePath: string, _options?: SignedUrlOptions): Promise<string> {
    // For local storage, return the full path
    // In a real app, you might want to generate a temporary access token
    return this.getFullPath(filePath);
  }

  async getSignedUploadUrl(_path: string, _options?: SignedUrlOptions): Promise<string> {
    throw new Error('Signed upload URLs not supported for local storage');
  }
}
