-- wavestk Initial Migration
-- Creates audio_files table and indexes

CREATE TABLE IF NOT EXISTS audio_files (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT,
  mime TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  url TEXT NOT NULL,
  uploaded_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audio_files_filename ON audio_files(filename);
CREATE INDEX IF NOT EXISTS idx_audio_files_uploaded_at ON audio_files(uploaded_at);
