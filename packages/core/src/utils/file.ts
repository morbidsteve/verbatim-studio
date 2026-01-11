/**
 * File utilities
 */

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()?.toLowerCase() || '' : '';
}

/**
 * Get filename without extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot > 0 ? filename.slice(0, lastDot) : filename;
}

/**
 * Get MIME type from filename
 */
export function getMimeType(filename: string): string {
  const ext = getFileExtension(filename);
  const mimeTypes: Record<string, string> = {
    // Audio
    wav: 'audio/wav',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    flac: 'audio/flac',
    ogg: 'audio/ogg',
    wma: 'audio/x-ms-wma',
    aac: 'audio/aac',
    // Video
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    wmv: 'video/x-ms-wmv',
    flv: 'video/x-flv',
    // Documents
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    json: 'application/json',
    srt: 'text/plain',
    vtt: 'text/vtt',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Check if MIME type is audio
 */
export function isAudioMimeType(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if MIME type is video
 */
export function isVideoMimeType(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const baseName = getFileNameWithoutExtension(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName}_${timestamp}_${random}${ext ? '.' + ext : ''}`;
}

/**
 * Calculate chunk count for file upload
 */
export function calculateChunks(fileSize: number, chunkSize: number): number {
  return Math.ceil(fileSize / chunkSize);
}

/**
 * Get chunk ranges for file upload
 */
export function getChunkRanges(
  fileSize: number,
  chunkSize: number
): Array<{ start: number; end: number; index: number }> {
  const chunks: Array<{ start: number; end: number; index: number }> = [];
  let start = 0;
  let index = 0;

  while (start < fileSize) {
    const end = Math.min(start + chunkSize, fileSize);
    chunks.push({ start, end, index });
    start = end;
    index++;
  }

  return chunks;
}
