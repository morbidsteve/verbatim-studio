/**
 * S3-compatible storage implementation.
 *
 * Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 */

import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import * as fs from 'fs';
import * as path from 'path';

import type {
  Storage,
  S3StorageConfig,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  ListResult,
  CopyOptions,
  SignedUrlOptions,
} from './types';

/**
 * S3-compatible storage implementation.
 */
export class S3Storage implements Storage {
  readonly provider = 's3' as const;

  private client: S3Client;
  private bucket: string;
  private prefix: string;
  private encrypt: boolean;

  constructor(config: S3StorageConfig) {
    this.bucket = config.bucket;
    this.prefix = config.prefix ?? '';
    this.encrypt = config.encrypt ?? false;

    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? {
              accessKeyId: config.accessKeyId,
              secretAccessKey: config.secretAccessKey,
            }
          : undefined,
    });
  }

  private getKey(filePath: string): string {
    return this.prefix ? `${this.prefix}/${filePath}` : filePath;
  }

  private stripPrefix(key: string): string {
    if (this.prefix && key.startsWith(this.prefix + '/')) {
      return key.slice(this.prefix.length + 1);
    }
    return key;
  }

  async upload(filePath: string, data: Buffer, options?: UploadOptions): Promise<FileMetadata> {
    const key = this.getKey(filePath);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
        ServerSideEncryption: this.encrypt ? 'AES256' : undefined,
        StorageClass: options?.storageClass,
      })
    );

    return {
      path: filePath,
      size: data.length,
      contentType: options?.contentType,
      lastModified: new Date(),
      metadata: options?.metadata,
    };
  }

  async uploadStream(
    filePath: string,
    stream: Readable,
    size: number,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    const key = this.getKey(filePath);

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: stream,
        ContentType: options?.contentType,
        ContentLength: size,
        Metadata: options?.metadata,
        ServerSideEncryption: this.encrypt ? 'AES256' : undefined,
        StorageClass: options?.storageClass,
      },
    });

    await upload.done();

    return {
      path: filePath,
      size,
      contentType: options?.contentType,
      lastModified: new Date(),
      metadata: options?.metadata,
    };
  }

  async uploadFile(
    localPath: string,
    remotePath: string,
    options?: UploadOptions
  ): Promise<FileMetadata> {
    const stats = await fs.promises.stat(localPath);
    const stream = fs.createReadStream(localPath);

    // Try to determine content type from extension
    const ext = path.extname(localPath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.wav': 'audio/wav',
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.flac': 'audio/flac',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.srt': 'text/plain',
      '.vtt': 'text/vtt',
    };

    return this.uploadStream(remotePath, stream, stats.size, {
      contentType: options?.contentType ?? contentTypes[ext],
      ...options,
    });
  }

  async download(filePath: string, options?: DownloadOptions): Promise<Buffer> {
    const key = this.getKey(filePath);

    const params: GetObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };

    if (options?.rangeStart !== undefined || options?.rangeEnd !== undefined) {
      const start = options.rangeStart ?? 0;
      const end = options.rangeEnd ?? '';
      params.Range = `bytes=${start}-${end}`;
    }

    const response = await this.client.send(new GetObjectCommand(params));
    const stream = response.Body as Readable;

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async downloadStream(filePath: string, options?: DownloadOptions): Promise<Readable> {
    const key = this.getKey(filePath);

    const params: GetObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };

    if (options?.rangeStart !== undefined || options?.rangeEnd !== undefined) {
      const start = options.rangeStart ?? 0;
      const end = options.rangeEnd ?? '';
      params.Range = `bytes=${start}-${end}`;
    }

    const response = await this.client.send(new GetObjectCommand(params));
    return response.Body as Readable;
  }

  async downloadFile(
    remotePath: string,
    localPath: string,
    options?: DownloadOptions
  ): Promise<void> {
    const stream = await this.downloadStream(remotePath, options);
    const writeStream = fs.createWriteStream(localPath);

    await new Promise<void>((resolve, reject) => {
      stream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      stream.on('error', reject);
    });
  }

  async exists(filePath: string): Promise<boolean> {
    const key = this.getKey(filePath);

    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        })
      );
      return true;
    } catch (err) {
      if ((err as { name: string }).name === 'NotFound') {
        return false;
      }
      throw err;
    }
  }

  async getMetadata(filePath: string): Promise<FileMetadata> {
    const key = this.getKey(filePath);

    const response = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );

    return {
      path: filePath,
      size: response.ContentLength ?? 0,
      contentType: response.ContentType,
      lastModified: response.LastModified ?? new Date(),
      hash: response.ETag?.replace(/"/g, ''),
      metadata: response.Metadata,
    };
  }

  async delete(filePath: string): Promise<void> {
    const key = this.getKey(filePath);

    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      })
    );
  }

  async deleteMany(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    // S3 allows max 1000 objects per delete request
    const chunks: string[][] = [];
    for (let i = 0; i < paths.length; i += 1000) {
      chunks.push(paths.slice(i, i + 1000));
    }

    for (const chunk of chunks) {
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: chunk.map((p) => ({ Key: this.getKey(p) })),
          },
        })
      );
    }
  }

  async copy(
    sourcePath: string,
    destPath: string,
    options?: CopyOptions
  ): Promise<FileMetadata> {
    const sourceKey = this.getKey(sourcePath);
    const destKey = this.getKey(destPath);

    // Check if dest exists
    if (!options?.overwrite && (await this.exists(destPath))) {
      throw new Error(`File already exists: ${destPath}`);
    }

    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${sourceKey}`,
        Key: destKey,
        Metadata: options?.metadata,
        MetadataDirective: options?.metadata ? 'REPLACE' : 'COPY',
      })
    );

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
    const prefix = options?.prefix ? this.getKey(options.prefix) : this.prefix;

    const response = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix || undefined,
        Delimiter: options?.delimiter,
        ContinuationToken: options?.continuationToken,
        MaxKeys: options?.maxKeys ?? 1000,
      })
    );

    const files: FileMetadata[] =
      response.Contents?.map((obj) => ({
        path: this.stripPrefix(obj.Key ?? ''),
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
        hash: obj.ETag?.replace(/"/g, ''),
      })) ?? [];

    const prefixes =
      response.CommonPrefixes?.map((p) => this.stripPrefix(p.Prefix ?? '')) ?? [];

    return {
      files,
      prefixes,
      continuationToken: response.NextContinuationToken,
      isTruncated: response.IsTruncated ?? false,
    };
  }

  async getSignedUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    const key = this.getKey(filePath);

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: options?.responseContentType,
      ResponseContentDisposition: options?.responseContentDisposition,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn ?? 3600,
    });
  }

  async getSignedUploadUrl(filePath: string, options?: SignedUrlOptions): Promise<string> {
    const key = this.getKey(filePath);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, {
      expiresIn: options?.expiresIn ?? 3600,
    });
  }
}
