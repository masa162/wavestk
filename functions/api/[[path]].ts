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
 * Health check endpoint
 */
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'wavestk-api' });
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
          contentType: file.type,
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
        .bind(audioId, filename, file.name, file.type, file.size, url, now, now)
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
