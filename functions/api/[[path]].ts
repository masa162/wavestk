/**
 * wavestk API Routes
 * Handles upload, list, and delete operations
 */

import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import type {
  Env,
  UploadFile,
  UploadResponse,
  ListResponse,
  DeleteResponse,
  AudioFile,
} from '../types';
import { errorResponse, handleError } from '../errors';

const app = new Hono<{ Bindings: Env }>().basePath('/api');

/**
 * Generate random 8-character alphanumeric ID
 */
function generateAudioId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Get file extension from MIME type
 */
function getExtension(mime: string): string {
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('aac')) return 'aac';
  if (mime.includes('wav')) return 'wav';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('opus')) return 'opus';
  if (mime.includes('flac')) return 'flac';
  if (mime.includes('webm')) return 'webm';
  return 'mp3'; // default
}

/**
 * Normalize MIME type to standard format
 * Ensures consistent MIME types for better browser compatibility
 */
function normalizeMimeType(mimeType: string, extension: string): string {
  const mime = mimeType.toLowerCase();

  // M4A/MP4 files should always be audio/mp4
  if (mime.includes('m4a') || mime.includes('mp4') || extension === 'm4a') {
    return 'audio/mp4';
  }

  // AAC files
  if (mime.includes('aac') || extension === 'aac') {
    return 'audio/aac';
  }

  // MP3 files
  if (mime.includes('mpeg') || mime.includes('mp3') || extension === 'mp3') {
    return 'audio/mpeg';
  }

  // WAV files
  if (mime.includes('wav') || extension === 'wav') {
    return 'audio/wav';
  }

  // OGG files
  if (mime.includes('ogg') || extension === 'ogg') {
    return 'audio/ogg';
  }

  // Opus files
  if (mime.includes('opus') || extension === 'opus') {
    return 'audio/opus';
  }

  // FLAC files
  if (mime.includes('flac') || extension === 'flac') {
    return 'audio/flac';
  }

  // WebM files
  if (mime.includes('webm') || extension === 'webm') {
    return 'audio/webm';
  }

  // Return original if no match (but should be validated earlier)
  return mimeType;
}

/**
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'wavestk-api' });
});

/**
 * Upload audio file chunk
 * POST /api/upload/chunk
 */
app.post('/upload/chunk', async (c) => {
  try {
    const body = await c.req.json<{
      uploadId: string;
      chunkIndex: number;
      totalChunks: number;
      chunkData: string;
      fileName: string;
      fileType: string;
      fileSize: number;
    }>();

    const { uploadId, chunkIndex, totalChunks, chunkData, fileName, fileType, fileSize } = body;

    // Validate inputs
    if (!uploadId || chunkIndex === undefined || !totalChunks || !chunkData) {
      return errorResponse(c, 'Missing required chunk parameters', 400);
    }

    if (chunkIndex < 0 || chunkIndex >= totalChunks) {
      return errorResponse(c, 'Invalid chunk index', 400);
    }

    // Validate audio MIME type
    if (!fileType.startsWith('audio/')) {
      return errorResponse(c, 'Only audio files are allowed', 400);
    }

    // Validate total file size (100MB limit)
    const MAX_SIZE = 100 * 1024 * 1024;
    if (fileSize > MAX_SIZE) {
      return errorResponse(c, `File too large: ${fileName} (max 100MB)`, 400);
    }

    // Decode Base64 chunk data
    let base64Data = chunkData;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    let binaryData: Uint8Array;
    try {
      binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    } catch (error) {
      return errorResponse(c, 'Invalid Base64 data in chunk', 400);
    }

    // Store chunk in R2 with temporary name
    const chunkFilename = `temp/${uploadId}/chunk_${chunkIndex}`;
    await c.env.R2_BUCKET.put(chunkFilename, binaryData);

    return c.json({
      uploadId,
      chunkIndex,
      received: true,
    });

  } catch (error) {
    return handleError(c, error, 'Chunk upload failed');
  }
});

/**
 * Complete chunked upload
 * POST /api/upload/complete
 */
app.post('/upload/complete', async (c) => {
  try {
    const body = await c.req.json<{
      uploadId: string;
      totalChunks: number;
      fileName: string;
      fileType: string;
      fileSize: number;
    }>();

    const { uploadId, totalChunks, fileName, fileType, fileSize } = body;

    // Validate inputs
    if (!uploadId || !totalChunks || !fileName || !fileType || !fileSize) {
      return errorResponse(c, 'Missing required parameters', 400);
    }

    // Retrieve all chunks from R2
    const chunks: Uint8Array[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilename = `temp/${uploadId}/chunk_${i}`;
      const chunkObject = await c.env.R2_BUCKET.get(chunkFilename);

      if (!chunkObject) {
        return errorResponse(c, `Missing chunk ${i}`, 400);
      }

      const chunkData = await chunkObject.arrayBuffer();
      chunks.push(new Uint8Array(chunkData));
    }

    // Combine all chunks
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const completeFile = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      completeFile.set(chunk, offset);
      offset += chunk.length;
    }

    // Generate unique audio ID
    let audioId: string = '';
    let exists = true;
    let attempts = 0;
    const MAX_ATTEMPTS = 10;

    while (exists && attempts < MAX_ATTEMPTS) {
      audioId = generateAudioId();
      const check = await c.env.DB.prepare('SELECT 1 FROM audio_files WHERE id = ?')
        .bind(audioId)
        .first();
      exists = !!check;
      attempts++;
    }

    if (exists) {
      return errorResponse(c, 'Failed to generate unique ID', 500);
    }

    // Create final filename
    const ext = getExtension(fileType);
    const filename = `${audioId}.${ext}`;
    const url = `https://wave.be2nd.com/${filename}`;

    // Normalize MIME type for consistent browser compatibility
    const normalizedMimeType = normalizeMimeType(fileType, ext);

    // Upload complete file to R2
    await c.env.R2_BUCKET.put(filename, completeFile, {
      httpMetadata: {
        contentType: normalizedMimeType,
      },
      customMetadata: {
        'original-filename': fileName,
      },
    });

    // Save metadata to D1
    const now = new Date().toISOString();
    await c.env.DB.prepare(`
      INSERT INTO audio_files (id, filename, original_filename, mime, bytes, url, uploaded_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
      .bind(audioId, filename, fileName, normalizedMimeType, fileSize, url, now, now)
      .run();

    // Clean up temporary chunks
    for (let i = 0; i < totalChunks; i++) {
      const chunkFilename = `temp/${uploadId}/chunk_${i}`;
      await c.env.R2_BUCKET.delete(chunkFilename);
    }

    return c.json({
      id: audioId,
      filename,
      url,
      originalFilename: fileName,
    });

  } catch (error) {
    return handleError(c, error, 'Upload completion failed');
  }
});

/**
 * Upload audio files
 * POST /api/upload
 */
app.post('/upload', async (c) => {
  try {
    const body = await c.req.json<{ files: UploadFile[] }>();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return errorResponse(c, 'No files provided', 400);
    }

    const results: UploadResponse['files'] = [];

    for (const file of files) {
      // Validate audio MIME type
      if (!file.type.startsWith('audio/')) {
        console.log(`Skipping non-audio file: ${file.name} (${file.type})`);
        continue;
      }

      // Validate file size (100MB limit)
      const MAX_SIZE = 100 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return errorResponse(c, `File too large: ${file.name} (max 100MB)`, 400);
      }

      // Generate unique random ID
      let audioId: string = '';
      let exists = true;
      let attempts = 0;
      const MAX_ATTEMPTS = 10;

      while (exists && attempts < MAX_ATTEMPTS) {
        audioId = generateAudioId();
        const check = await c.env.DB.prepare('SELECT 1 FROM audio_files WHERE id = ?')
          .bind(audioId)
          .first();
        exists = !!check;
        attempts++;
      }

      if (exists) {
        return errorResponse(c, 'Failed to generate unique ID', 500);
      }

      // Create filename
      const ext = getExtension(file.type);
      const filename = `${audioId}.${ext}`;
      const url = `https://wave.be2nd.com/${filename}`;

      // Normalize MIME type for consistent browser compatibility
      const normalizedMimeType = normalizeMimeType(file.type, ext);

      // Decode Base64 data
      let base64Data = file.data;
      if (base64Data.includes(',')) {
        // Remove data URL prefix if present
        base64Data = base64Data.split(',')[1];
      }

      let binaryData: Uint8Array;
      try {
        binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
      } catch (error) {
        return errorResponse(c, 'Invalid Base64 data', 400);
      }

      // Upload to R2
      await c.env.R2_BUCKET.put(filename, binaryData, {
        httpMetadata: {
          contentType: normalizedMimeType,
        },
        customMetadata: {
          'original-filename': file.name,
        },
      });

      // Save metadata to D1
      const now = new Date().toISOString();
      await c.env.DB.prepare(`
        INSERT INTO audio_files (id, filename, original_filename, mime, bytes, url, uploaded_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(audioId, filename, file.name, normalizedMimeType, file.size, url, now, now)
        .run();

      results.push({
        id: audioId,
        filename,
        url,
        originalFilename: file.name,
      });
    }

    if (results.length === 0) {
      return errorResponse(c, 'No audio files were uploaded', 400);
    }

    return c.json<UploadResponse>({
      uploaded: results.length,
      files: results,
    });

  } catch (error) {
    return handleError(c, error, 'Upload failed');
  }
});

/**
 * List audio files with optional search
 * GET /api/audio?search={keyword}&limit={limit}&offset={offset}
 */
app.get('/audio', async (c) => {
  try {
    const search = c.req.query('search') || '';
    const limit = parseInt(c.req.query('limit') || '50', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);

    let sql = 'SELECT * FROM audio_files WHERE 1=1';
    const params: (string | number)[] = [];

    // Add search filter
    if (search) {
      sql += ' AND (original_filename LIKE ? OR filename LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Add ordering and pagination
    sql += ' ORDER BY uploaded_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(sql).bind(...params).all<AudioFile>();

    return c.json<ListResponse>({
      audio: result.results || [],
      count: result.results?.length || 0,
      limit,
      offset,
    });

  } catch (error) {
    return handleError(c, error, 'Failed to list audio files');
  }
});

/**
 * Delete audio file
 * DELETE /api/audio/{id}
 */
app.delete('/audio/:id', async (c) => {
  try {
    const audioId = c.req.param('id');

    // Get audio metadata
    const audio = await c.env.DB.prepare('SELECT filename FROM audio_files WHERE id = ?')
      .bind(audioId)
      .first<{ filename: string }>();

    if (!audio) {
      return errorResponse(c, 'Audio file not found', 404);
    }

    // Delete from R2
    await c.env.R2_BUCKET.delete(audio.filename);

    // Delete from D1
    await c.env.DB.prepare('DELETE FROM audio_files WHERE id = ?')
      .bind(audioId)
      .run();

    return c.json<DeleteResponse>({
      deleted: audioId,
    });

  } catch (error) {
    return handleError(c, error, 'Delete failed');
  }
});

export const onRequest = handle(app);
