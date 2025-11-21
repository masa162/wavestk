/**
 * wavestk Type Definitions
 */

export interface Env {
  R2_BUCKET: R2Bucket;
  DB: D1Database;
  BASIC_AUTH_USER: string;
  BASIC_AUTH_PASS: string;
}

export interface UploadFile {
  name: string;
  data: string; // Base64 encoded data URL
  size: number;
  type: string; // MIME type
}

export interface AudioFile {
  id: string;
  filename: string;
  original_filename: string | null;
  mime: string;
  bytes: number;
  url: string;
  uploaded_at: string;
  created_at: string;
}

export interface UploadResponse {
  uploaded: number;
  files: {
    id: string;
    filename: string;
    url: string;
    originalFilename: string;
  }[];
}

export interface ListResponse {
  audio: AudioFile[];
  count: number;
  limit: number;
  offset: number;
}

export interface DeleteResponse {
  deleted: string;
}

export interface ErrorResponse {
  error: string;
}
