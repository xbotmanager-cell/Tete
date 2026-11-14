import path from 'node:path';
import fs from 'node:fs';
import { Pool } from 'pg';

export class DatabaseConfigError extends Error {
  status = 500;
  code = 'DATABASE_NOT_CONFIGURED';
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseConfigError';
  }
}

export interface DbUser {
  id: number;
  email: string;
  name: string;
  preferred_quality: string;
  preferred_subtitle_lang: string;
  preferred_audio_lang: string;
  preferred_layout: string;
  created_at: string;
}

export interface DbUserWithPassword extends DbUser {
  password_hash: string;
}

export interface DbLibraryItem {
  id: number;
  user_id: number;
  list_type: 'watchlist' | 'favorite';
  media_type: string;
  item_id: string;
  slug: string;
  provider: string;
  title: string;
  poster: string | null;
  year: string | null;
  metadata_json: string | null;
  created_at: string;
}

export interface DbWatchProgress {
  id: number;
  user_id: number;
  content_id: string;
  slug: string;
  provider: string;
  media_type: string;
  title: string;
  poster: string | null;
  season: number;
  episode: number;
  position_seconds: number;
  duration_seconds: number;
  updated_at: string;
}

export interface DbReadingProgress {
  id: number;
  user_id: number;
  novel_id: string;
  novel_title: string;
  cover: string | null;
  chapter_id: string;
  chapter_title: string;
  progress_percent: number;
  updated_at: string;
}

const PG_SCHEMA_SQL = `
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

  ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_layout TEXT NOT NULL DEFAULT 'cinematic';

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
`;

const SQLITE_SCHEMA_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    preferred_quality TEXT NOT NULL DEFAULT '1080',
    preferred_subtitle_lang TEXT NOT NULL DEFAULT 'en',
    preferred_audio_lang TEXT NOT NULL DEFAULT 'en',
    preferred_layout TEXT NOT NULL DEFAULT 'cinematic',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS library_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_type TEXT NOT NULL CHECK (list_type IN ('watchlist', 'favorite')),
    media_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'moviebox',
    title TEXT NOT NULL,
    poster TEXT,
    year TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, list_type, item_id, media_type)
  );

  CREATE TABLE IF NOT EXISTS watch_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id TEXT NOT NULL,
    slug TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'moviebox',
    media_type TEXT NOT NULL DEFAULT 'movie',
    title TEXT NOT NULL,
    poster TEXT,
    season INTEGER NOT NULL DEFAULT 0,
    episode INTEGER NOT NULL DEFAULT 0,
    position_seconds REAL NOT NULL DEFAULT 0,
    duration_seconds REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, content_id, media_type, season, episode)
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    novel_id TEXT NOT NULL,
    novel_title TEXT NOT NULL,
    cover TEXT,
    chapter_id TEXT NOT NULL,
    chapter_title TEXT NOT NULL,
    progress_percent REAL NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, novel_id)
  );
`;

const globalForDb = globalThis as unknown as {
  __lupinPgPool?: Pool;
  __lupinPgSchemaPromise?: Promise<void>;
  __lupinSqliteDb?: import('node:sqlite').DatabaseSync;
};

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function getDatabaseUrl(): string | undefined {
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.SUPABASE_DB_URL;
  return url && url.trim() ? url.trim() : undefined;
}

function toIso(val: unknown): string {
  if (val instanceof Date) return val.toISOString();
  return String(val ?? new Date().toISOString());
}

function normalizeUser(row: Record<string, unknown>): DbUser {
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    preferred_quality: String(row.preferred_quality ?? '1080'),
    preferred_subtitle_lang: String(row.preferred_subtitle_lang ?? 'en'),
    preferred_audio_lang: String(row.preferred_audio_lang ?? 'en'),
    preferred_layout: String(row.preferred_layout ?? 'cinematic'),
    created_at: toIso(row.created_at),
  };
}

function normalizeLibraryItem(row: Record<string, unknown>): DbLibraryItem {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    list_type: row.list_type === 'favorite' ? 'favorite' : 'watchlist',
    media_type: String(row.media_type),
    item_id: String(row.item_id),
    slug: String(row.slug),
    provider: String(row.provider ?? 'moviebox'),
    title: String(row.title),
    poster: row.poster ? String(row.poster) : null,
    year: row.year ? String(row.year) : null,
    metadata_json: row.metadata_json ? String(row.metadata_json) : null,
    created_at: toIso(row.created_at),
  };
}

function normalizeWatchProgress(row: Record<string, unknown>): DbWatchProgress {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    content_id: String(row.content_id),
    slug: String(row.slug),
    provider: String(row.provider ?? 'moviebox'),
    media_type: String(row.media_type ?? 'movie'),
    title: String(row.title),
    poster: row.poster ? String(row.poster) : null,
    season: Number(row.season ?? 0),
    episode: Number(row.episode ?? 0),
    position_seconds: Number(row.position_seconds ?? 0),
    duration_seconds: Number(row.duration_seconds ?? 0),
    updated_at: toIso(row.updated_at),
  };
}

function normalizeReadingProgress(row: Record<string, unknown>): DbReadingProgress {
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    novel_id: String(row.novel_id),
    novel_title: String(row.novel_title),
    cover: row.cover ? String(row.cover) : null,
    chapter_id: String(row.chapter_id),
    chapter_title: String(row.chapter_title),
    progress_percent: Number(row.progress_percent ?? 0),
    updated_at: toIso(row.updated_at),
  };
}

async function getPgPool(): Promise<Pool> {
  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new DatabaseConfigError(
      'DATABASE_URL is not configured. Connect a persistent PostgreSQL database (such as Supabase) in your environment settings.'
    );
  }

  if (!globalForDb.__lupinPgPool) {
    const isLocalDb =
      connectionString.includes('localhost') ||
      connectionString.includes('127.0.0.1') ||
      connectionString.includes('sslmode=disable');

    globalForDb.__lupinPgPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 20_000,
      connectionTimeoutMillis: 10_000,
      ssl: isLocalDb ? undefined : { rejectUnauthorized: false },
    });
  }

  if (!globalForDb.__lupinPgSchemaPromise) {
    const pool = globalForDb.__lupinPgPool;
    globalForDb.__lupinPgSchemaPromise = pool
      .query(PG_SCHEMA_SQL)
      .then(() => undefined)
      .catch((err) => {
        globalForDb.__lupinPgSchemaPromise = undefined;
        throw err;
      });
  }

  await globalForDb.__lupinPgSchemaPromise;
  return globalForDb.__lupinPgPool;
}

async function getSqliteDb(): Promise<import('node:sqlite').DatabaseSync> {
  if (isVercelRuntime()) {
    throw new DatabaseConfigError(
      'DATABASE_URL environment variable is required on Vercel. SQLite is not persistent in serverless deployments.'
    );
  }

  if (!globalForDb.__lupinSqliteDb) {
    const { DatabaseSync } = await import('node:sqlite');
    const dataDir = path.resolve(process.cwd(), '.data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'lupin_movies.db');
    const sqlite = new DatabaseSync(dbPath);
    sqlite.exec(SQLITE_SCHEMA_SQL);
    const cols = sqlite.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === 'preferred_layout')) {
      sqlite.exec("ALTER TABLE users ADD COLUMN preferred_layout TEXT NOT NULL DEFAULT 'cinematic'");
    }
    globalForDb.__lupinSqliteDb = sqlite;
  }

  return globalForDb.__lupinSqliteDb;
}

function usePostgres(): boolean {
  return Boolean(getDatabaseUrl()) || isVercelRuntime();
}

export async function checkDatabaseHealth(): Promise<{
  ok: boolean;
  driver: 'postgres' | 'sqlite';
  latencyMs: number;
  error?: string;
}> {
  const started = Date.now();
  if (usePostgres()) {
    try {
      const pool = await getPgPool();
      await pool.query('SELECT 1');
      return { ok: true, driver: 'postgres', latencyMs: Date.now() - started };
    } catch (err) {
      return {
        ok: false,
        driver: 'postgres',
        latencyMs: Date.now() - started,
        error: err instanceof Error ? err.message : 'PostgreSQL connection failed',
      };
    }
  }

  try {
    const sqlite = await getSqliteDb();
    sqlite.prepare('SELECT 1').get();
    return { ok: true, driver: 'sqlite', latencyMs: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      driver: 'sqlite',
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : 'SQLite initialization failed',
    };
  }
}

export async function findUserIdByEmail(email: string): Promise<number | null> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const res = await pool.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
    return res.rows[0] ? Number(res.rows[0].id) : null;
  }
  const sqlite = await getSqliteDb();
  const row = sqlite.prepare('SELECT id FROM users WHERE email = ?').get(email) as
    | { id: number }
    | undefined;
  return row ? Number(row.id) : null;
}

export async function findUserWithPasswordByEmail(
  email: string
): Promise<DbUserWithPassword | null> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const res = await pool.query(
      'SELECT id, email, name, password_hash, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0] as Record<string, unknown>;
    return { ...normalizeUser(row), password_hash: String(row.password_hash) };
  }
  const sqlite = await getSqliteDb();
  const row = sqlite
    .prepare(
      'SELECT id, email, name, password_hash, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at FROM users WHERE email = ?'
    )
    .get(email) as Record<string, unknown> | undefined;
  if (!row) return null;
  return { ...normalizeUser(row), password_hash: String(row.password_hash) };
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string;
}): Promise<DbUser> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const res = await pool.query(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at`,
      [input.email, input.name, input.passwordHash]
    );
    return normalizeUser(res.rows[0] as Record<string, unknown>);
  }
  const sqlite = await getSqliteDb();
  const result = sqlite
    .prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)')
    .run(input.email, input.name, input.passwordHash);
  const userId = Number(result.lastInsertRowid);
  const row = sqlite
    .prepare(
      'SELECT id, email, name, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at FROM users WHERE id = ?'
    )
    .get(userId) as Record<string, unknown>;
  return normalizeUser(row);
}

export async function updateUserProfile(
  userId: number,
  patch: {
    name: string;
    preferred_quality: string;
    preferred_subtitle_lang: string;
    preferred_audio_lang: string;
    preferred_layout: string;
  }
): Promise<DbUser | null> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const res = await pool.query(
      `UPDATE users
       SET name = $1, preferred_quality = $2, preferred_subtitle_lang = $3, preferred_audio_lang = $4, preferred_layout = $5
       WHERE id = $6
       RETURNING id, email, name, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at`,
      [
        patch.name,
        patch.preferred_quality,
        patch.preferred_subtitle_lang,
        patch.preferred_audio_lang,
        patch.preferred_layout,
        userId,
      ]
    );
    return res.rows[0] ? normalizeUser(res.rows[0] as Record<string, unknown>) : null;
  }
  const sqlite = await getSqliteDb();
  sqlite
    .prepare(
      'UPDATE users SET name = ?, preferred_quality = ?, preferred_subtitle_lang = ?, preferred_audio_lang = ?, preferred_layout = ? WHERE id = ?'
    )
    .run(
      patch.name,
      patch.preferred_quality,
      patch.preferred_subtitle_lang,
      patch.preferred_audio_lang,
      patch.preferred_layout,
      userId
    );
  const row = sqlite
    .prepare(
      'SELECT id, email, name, preferred_quality, preferred_subtitle_lang, preferred_audio_lang, preferred_layout, created_at FROM users WHERE id = ?'
    )
    .get(userId) as Record<string, unknown> | undefined;
  return row ? normalizeUser(row) : null;
}

export async function createSessionRecord(input: {
  token: string;
  userId: number;
  expiresAt: Date;
}): Promise<void> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query(
      'INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, $3)',
      [input.token, input.userId, input.expiresAt.toISOString()]
    );
    return;
  }
  const sqlite = await getSqliteDb();
  const sqliteExpires = input.expiresAt.toISOString().replace('T', ' ').slice(0, 19);
  sqlite
    .prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .run(input.token, input.userId, sqliteExpires);
}

export async function findSessionUser(token: string): Promise<DbUser | null> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const res = await pool.query(
      `SELECT u.id, u.email, u.name, u.preferred_quality, u.preferred_subtitle_lang, u.preferred_audio_lang, u.preferred_layout, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    return res.rows[0] ? normalizeUser(res.rows[0] as Record<string, unknown>) : null;
  }
  const sqlite = await getSqliteDb();
  const row = sqlite
    .prepare(
      `SELECT u.id, u.email, u.name, u.preferred_quality, u.preferred_subtitle_lang, u.preferred_audio_lang, u.preferred_layout, u.created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`
    )
    .get(token) as Record<string, unknown> | undefined;
  return row ? normalizeUser(row) : null;
}

export async function deleteSessionRecord(token: string): Promise<void> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    return;
  }
  const sqlite = await getSqliteDb();
  sqlite.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export async function getUserLibraryData(userId: number): Promise<{
  items: DbLibraryItem[];
  progress: DbWatchProgress[];
  reading: DbReadingProgress[];
}> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const [itemsRes, progressRes, readingRes] = await Promise.all([
      pool.query('SELECT * FROM library_items WHERE user_id = $1 ORDER BY created_at DESC', [
        userId,
      ]),
      pool.query(
        'SELECT * FROM watch_progress WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 40',
        [userId]
      ),
      pool.query(
        'SELECT * FROM reading_progress WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 30',
        [userId]
      ),
    ]);
    return {
      items: itemsRes.rows.map((r) => normalizeLibraryItem(r as Record<string, unknown>)),
      progress: progressRes.rows.map((r) => normalizeWatchProgress(r as Record<string, unknown>)),
      reading: readingRes.rows.map((r) => normalizeReadingProgress(r as Record<string, unknown>)),
    };
  }

  const sqlite = await getSqliteDb();
  const items = sqlite
    .prepare('SELECT * FROM library_items WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Record<string, unknown>[];
  const progress = sqlite
    .prepare('SELECT * FROM watch_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 40')
    .all(userId) as Record<string, unknown>[];
  const reading = sqlite
    .prepare('SELECT * FROM reading_progress WHERE user_id = ? ORDER BY updated_at DESC LIMIT 30')
    .all(userId) as Record<string, unknown>[];

  return {
    items: items.map(normalizeLibraryItem),
    progress: progress.map(normalizeWatchProgress),
    reading: reading.map(normalizeReadingProgress),
  };
}

export async function toggleUserLibraryItem(
  userId: number,
  input: {
    list_type: 'watchlist' | 'favorite';
    media_type: string;
    item_id: string;
    slug: string;
    provider: string;
    title: string;
    poster: string | null;
    year: string | null;
    metadata_json: string | null;
  }
): Promise<{ active: boolean }> {
  if (usePostgres()) {
    const pool = await getPgPool();
    const existing = await pool.query(
      'SELECT id FROM library_items WHERE user_id = $1 AND list_type = $2 AND item_id = $3 AND media_type = $4 LIMIT 1',
      [userId, input.list_type, input.item_id, input.media_type]
    );
    if (existing.rows[0]) {
      await pool.query('DELETE FROM library_items WHERE id = $1', [existing.rows[0].id]);
      return { active: false };
    }
    await pool.query(
      `INSERT INTO library_items (user_id, list_type, media_type, item_id, slug, provider, title, poster, year, metadata_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        input.list_type,
        input.media_type,
        input.item_id,
        input.slug,
        input.provider,
        input.title,
        input.poster,
        input.year,
        input.metadata_json,
      ]
    );
    return { active: true };
  }

  const sqlite = await getSqliteDb();
  const existing = sqlite
    .prepare(
      'SELECT id FROM library_items WHERE user_id = ? AND list_type = ? AND item_id = ? AND media_type = ?'
    )
    .get(userId, input.list_type, input.item_id, input.media_type) as { id: number } | undefined;

  if (existing) {
    sqlite.prepare('DELETE FROM library_items WHERE id = ?').run(existing.id);
    return { active: false };
  }

  sqlite
    .prepare(
      `INSERT INTO library_items (user_id, list_type, media_type, item_id, slug, provider, title, poster, year, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.list_type,
      input.media_type,
      input.item_id,
      input.slug,
      input.provider,
      input.title,
      input.poster,
      input.year,
      input.metadata_json
    );
  return { active: true };
}

export async function upsertWatchProgress(
  userId: number,
  input: {
    content_id: string;
    slug: string;
    provider: string;
    media_type: string;
    title: string;
    poster: string | null;
    season: number;
    episode: number;
    position_seconds: number;
    duration_seconds: number;
  }
): Promise<void> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query(
      `INSERT INTO watch_progress
         (user_id, content_id, slug, provider, media_type, title, poster, season, episode, position_seconds, duration_seconds, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (user_id, content_id, media_type, season, episode)
       DO UPDATE SET
         slug = EXCLUDED.slug,
         title = EXCLUDED.title,
         poster = COALESCE(EXCLUDED.poster, watch_progress.poster),
         position_seconds = EXCLUDED.position_seconds,
         duration_seconds = EXCLUDED.duration_seconds,
         updated_at = NOW()`,
      [
        userId,
        input.content_id,
        input.slug,
        input.provider,
        input.media_type,
        input.title,
        input.poster,
        input.season,
        input.episode,
        input.position_seconds,
        input.duration_seconds,
      ]
    );
    return;
  }

  const sqlite = await getSqliteDb();
  sqlite
    .prepare(
      `INSERT INTO watch_progress
         (user_id, content_id, slug, provider, media_type, title, poster, season, episode, position_seconds, duration_seconds, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, content_id, media_type, season, episode)
       DO UPDATE SET
         slug = excluded.slug,
         title = excluded.title,
         poster = COALESCE(excluded.poster, watch_progress.poster),
         position_seconds = excluded.position_seconds,
         duration_seconds = excluded.duration_seconds,
         updated_at = datetime('now')`
    )
    .run(
      userId,
      input.content_id,
      input.slug,
      input.provider,
      input.media_type,
      input.title,
      input.poster,
      input.season,
      input.episode,
      input.position_seconds,
      input.duration_seconds
    );
}

export async function upsertReadingProgress(
  userId: number,
  input: {
    novel_id: string;
    novel_title: string;
    cover: string | null;
    chapter_id: string;
    chapter_title: string;
    progress_percent: number;
  }
): Promise<void> {
  if (usePostgres()) {
    const pool = await getPgPool();
    await pool.query(
      `INSERT INTO reading_progress
         (user_id, novel_id, novel_title, cover, chapter_id, chapter_title, progress_percent, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, novel_id)
       DO UPDATE SET
         novel_title = EXCLUDED.novel_title,
         cover = COALESCE(EXCLUDED.cover, reading_progress.cover),
         chapter_id = EXCLUDED.chapter_id,
         chapter_title = EXCLUDED.chapter_title,
         progress_percent = EXCLUDED.progress_percent,
         updated_at = NOW()`,
      [
        userId,
        input.novel_id,
        input.novel_title,
        input.cover,
        input.chapter_id,
        input.chapter_title,
        input.progress_percent,
      ]
    );
    return;
  }

  const sqlite = await getSqliteDb();
  sqlite
    .prepare(
      `INSERT INTO reading_progress
         (user_id, novel_id, novel_title, cover, chapter_id, chapter_title, progress_percent, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, novel_id)
       DO UPDATE SET
         novel_title = excluded.novel_title,
         cover = COALESCE(excluded.cover, reading_progress.cover),
         chapter_id = excluded.chapter_id,
         chapter_title = excluded.chapter_title,
         progress_percent = excluded.progress_percent,
         updated_at = datetime('now')`
    )
    .run(
      userId,
      input.novel_id,
      input.novel_title,
      input.cover,
      input.chapter_id,
      input.chapter_title,
      input.progress_percent
    );
}
