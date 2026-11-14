-- LUPIN MOVIES — Supabase / PostgreSQL Initial Schema Migration
-- Run this in the Supabase SQL Editor or via `supabase db push` / `psql "$DATABASE_URL" -f supabase/migrations/001_initial_schema.sql`.

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  preferred_quality TEXT NOT NULL DEFAULT '1080',
  preferred_subtitle_lang TEXT NOT NULL DEFAULT 'en',
  preferred_audio_lang TEXT NOT NULL DEFAULT 'en',
  preferred_layout TEXT NOT NULL DEFAULT 'cinematic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_expires
  ON sessions (user_id, expires_at);

CREATE TABLE IF NOT EXISTS library_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('watchlist', 'favorite')),
  media_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'moviebox',
  title TEXT NOT NULL,
  poster TEXT,
  year TEXT,
  metadata_json TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, list_type, item_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_library_items_user_created
  ON library_items (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS watch_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'moviebox',
  media_type TEXT NOT NULL DEFAULT 'movie',
  title TEXT NOT NULL,
  poster TEXT,
  season INTEGER NOT NULL DEFAULT 0,
  episode INTEGER NOT NULL DEFAULT 0,
  position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id, media_type, season, episode)
);

CREATE INDEX IF NOT EXISTS idx_watch_progress_user_updated
  ON watch_progress (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS reading_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  novel_id TEXT NOT NULL,
  novel_title TEXT NOT NULL,
  cover TEXT,
  chapter_id TEXT NOT NULL,
  chapter_title TEXT NOT NULL,
  progress_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, novel_id)
);

CREATE INDEX IF NOT EXISTS idx_reading_progress_user_updated
  ON reading_progress (user_id, updated_at DESC);
