-- wavestk D1 Database Schema
-- Audio files metadata table

CREATE TABLE IF NOT EXISTS audio_files (
  id TEXT PRIMARY KEY,              -- Random ID (8 characters, e.g., abc123de)
  filename TEXT NOT NULL,            -- e.g., abc123de.mp3
  original_filename TEXT,            -- Original filename from upload
  mime TEXT NOT NULL,                -- audio/mpeg, audio/mp4, etc.
  bytes INTEGER NOT NULL,            -- File size in bytes
  url TEXT NOT NULL,                 -- https://wave.be2nd.com/abc123de.mp3
  uploaded_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_audio_files_filename ON audio_files(filename);
CREATE INDEX idx_audio_files_uploaded_at ON audio_files(uploaded_at);
