import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import {
  checkDatabaseHealth,
  createSessionRecord,
  createUser,
  DatabaseConfigError,
  deleteSessionRecord,
  findSessionUser,
  findUserIdByEmail,
  findUserWithPasswordByEmail,
  getUserLibraryData,
  toggleUserLibraryItem,
  updateUserProfile,
  upsertReadingProgress,
  upsertWatchProgress,
  type DbUser,
} from '../db.ts';

export const localRouter = Router();

const SESSION_COOKIE = 'lupin_session';
const SESSION_DAYS = 14;

function isVercelRuntime(): boolean {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    if (isVercelRuntime() || process.env.NODE_ENV === 'production') {
      throw new DatabaseConfigError(
        'SESSION_SECRET is not configured on the server. Set SESSION_SECRET in your environment variables.'
      );
    }
    return 'lupin-local-dev-session-secret-change-in-production';
  }
  return secret;
}

function signSessionToken(rawToken: string): string {
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(rawToken)
    .digest('hex');
  return `${rawToken}.${sig}`;
}

function verifySignedSessionCookie(cookieValue: string): string | null {
  const dotIdx = cookieValue.indexOf('.');
  if (dotIdx <= 0) return null;
  const rawToken = cookieValue.slice(0, dotIdx);
  const sigHex = cookieValue.slice(dotIdx + 1);
  if (!rawToken || !sigHex) return null;

  const expectedHex = crypto
    .createHmac('sha256', getSessionSecret())
    .update(rawToken)
    .digest('hex');

  const sigBuf = Buffer.from(sigHex, 'hex');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (sigBuf.length === 0 || sigBuf.length !== expectedBuf.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  return hashSessionToken(rawToken);
}

function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, keyHex] = stored.split(':');
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, 'hex');
  const derivedBuf = crypto.scryptSync(password, salt, 64);
  if (keyBuf.length !== derivedBuf.length) return false;
  return crypto.timingSafeEqual(keyBuf, derivedBuf);
}

function parseCookies(req: Request): Record<string, string> {
  const raw = req.headers.cookie || '';
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const k = part.slice(0, idx).trim();
      try {
        const v = decodeURIComponent(part.slice(idx + 1).trim());
        out[k] = v;
      } catch {
        out[k] = part.slice(idx + 1).trim();
      }
    }
  }
  return out;
}

function isHttpsRequest(req: Request): boolean {
  return (
    req.secure ||
    req.get('x-forwarded-proto') === 'https' ||
    isVercelRuntime() ||
    process.env.NODE_ENV === 'production'
  );
}

function extractSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req);
  return cookies[SESSION_COOKIE] || null;
}

async function getAuthenticatedUser(req: Request): Promise<DbUser | null> {
  const cookieVal = extractSessionTokenFromRequest(req);
  if (!cookieVal) return null;

  const tokenHash = verifySignedSessionCookie(cookieVal);
  if (!tokenHash) return null;

  return findSessionUser(tokenHash);
}

async function createSession(req: Request, res: Response, userId: number): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const signedCookie = signSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);

  await createSessionRecord({
    token: tokenHash,
    userId,
    expiresAt,
  });

  res.cookie(SESSION_COOKIE, signedCookie, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isHttpsRequest(req),
    maxAge: SESSION_DAYS * 86400_000,
    path: '/',
  });

  return signedCookie;
}

function handleLocalError(res: Response, err: unknown) {
  if (err instanceof DatabaseConfigError) {
    return res.status(500).json({
      ok: false,
      status: 500,
      code: err.code,
      error: err.message,
    });
  }
  const message = err instanceof Error ? err.message : 'Internal server error';
  return res.status(500).json({
    ok: false,
    status: 500,
    code: 'INTERNAL_ERROR',
    error: message,
  });
}

// Local Health & Database Connectivity Check
localRouter.get('/health', async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.ok) {
    return res.status(500).json({
      ok: false,
      status: 500,
      code: 'DATABASE_UNAVAILABLE',
      driver: dbHealth.driver,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error || 'Database health check failed',
    });
  }
  return res.json({
    ok: true,
    driver: dbHealth.driver,
    latencyMs: dbHealth.latencyMs,
  });
});

// Auth: Register
localRouter.post('/auth/register', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const name = String(req.body?.name || '').trim() || email.split('@')[0];

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existingId = await findUserIdByEmail(email);
    if (existingId !== null) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = hashPassword(password);
    const user = await createUser({ email, name, passwordHash });
    const sessionToken = await createSession(req, res, user.id);

    return res.status(201).json({ user, sessionToken });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Auth: Login
localRouter.post('/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const row = await findUserWithPasswordByEmail(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const sessionToken = await createSession(req, res, row.id);
    const { password_hash: _ph, ...user } = row;
    return res.json({ user, sessionToken });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Auth: Current user
localRouter.get('/auth/me', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    return res.json({ user });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Auth: Logout
localRouter.post('/auth/logout', async (req, res) => {
  try {
    const cookieVal = extractSessionTokenFromRequest(req);
    if (cookieVal) {
      const tokenHash = verifySignedSessionCookie(cookieVal);
      if (tokenHash) {
        await deleteSessionRecord(tokenHash);
      }
    }
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    return res.json({ ok: true });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Profile & Preferences
localRouter.patch('/auth/profile', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required.' });

    const name = req.body?.name ? String(req.body.name).trim() : user.name;
    const preferred_quality = req.body?.preferred_quality
      ? String(req.body.preferred_quality)
      : user.preferred_quality;
    const preferred_subtitle_lang = req.body?.preferred_subtitle_lang
      ? String(req.body.preferred_subtitle_lang)
      : user.preferred_subtitle_lang;
    const preferred_audio_lang = req.body?.preferred_audio_lang
      ? String(req.body.preferred_audio_lang)
      : user.preferred_audio_lang;

    const rawLayout = req.body?.preferred_layout ? String(req.body.preferred_layout) : user.preferred_layout;
    const validLayouts = new Set(['cinematic', 'classic', 'sidebar', 'editorial', 'neon', 'minimalist']);
    const preferred_layout = validLayouts.has(rawLayout) ? rawLayout : user.preferred_layout;

    const updated = await updateUserProfile(user.id, {
      name,
      preferred_quality,
      preferred_subtitle_lang,
      preferred_audio_lang,
      preferred_layout,
    });

    return res.json({ user: updated });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Personal Library (Watchlist & Favorites)
localRouter.get('/library', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.json({ items: [], progress: [], reading: [] });

    const data = await getUserLibraryData(user.id);
    return res.json(data);
  } catch (err) {
    return handleLocalError(res, err);
  }
});

localRouter.post('/library/toggle', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to sync your personal library.' });

    const list_type = req.body?.list_type === 'favorite' ? 'favorite' : 'watchlist';
    const media_type = String(req.body?.media_type || 'movie');
    const item_id = String(req.body?.item_id || '').trim();
    const slug = String(req.body?.slug || item_id).trim();
    const provider = String(req.body?.provider || 'moviebox');
    const title = String(req.body?.title || 'Untitled');
    const poster = req.body?.poster ? String(req.body.poster) : null;
    const year = req.body?.year ? String(req.body.year) : null;
    const metadata_json = req.body?.metadata ? JSON.stringify(req.body.metadata) : null;

    if (!item_id) return res.status(400).json({ error: 'item_id is required' });

    const result = await toggleUserLibraryItem(user.id, {
      list_type,
      media_type,
      item_id,
      slug,
      provider,
      title,
      poster,
      year,
      metadata_json,
    });

    return res.json(result);
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Watch Progress (Continue Watching & Recently Watched)
localRouter.post('/progress/watch', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.json({ ok: false, guest: true });

    const content_id = String(req.body?.content_id || '').trim();
    if (!content_id) return res.status(400).json({ error: 'content_id is required' });

    const slug = String(req.body?.slug || content_id);
    const provider = String(req.body?.provider || 'moviebox');
    const media_type = String(req.body?.media_type || 'movie');
    const title = String(req.body?.title || 'Untitled');
    const poster = req.body?.poster ? String(req.body.poster) : null;
    const season = Number(req.body?.season || 0);
    const episode = Number(req.body?.episode || 0);
    const position_seconds = Math.max(0, Number(req.body?.position_seconds || 0));
    const duration_seconds = Math.max(0, Number(req.body?.duration_seconds || 0));

    await upsertWatchProgress(user.id, {
      content_id,
      slug,
      provider,
      media_type,
      title,
      poster,
      season,
      episode,
      position_seconds,
      duration_seconds,
    });

    return res.json({ ok: true });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Reading Progress (Novels)
localRouter.post('/progress/reading', async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return res.json({ ok: false, guest: true });

    const novel_id = String(req.body?.novel_id || '').trim();
    const chapter_id = String(req.body?.chapter_id || '').trim();
    if (!novel_id || !chapter_id) {
      return res.status(400).json({ error: 'novel_id and chapter_id are required' });
    }

    const novel_title = String(req.body?.novel_title || 'Untitled Novel');
    const cover = req.body?.cover ? String(req.body.cover) : null;
    const chapter_title = String(req.body?.chapter_title || 'Chapter');
    const progress_percent = Math.min(100, Math.max(0, Number(req.body?.progress_percent || 0)));

    await upsertReadingProgress(user.id, {
      novel_id,
      novel_title,
      cover,
      chapter_id,
      chapter_title,
      progress_percent,
    });

    return res.json({ ok: true });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Android Application Update Manifest Endpoint
localRouter.get('/app-update', async (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const remoteManifestUrl = process.env.APP_UPDATE_MANIFEST_URL?.trim();
    if (remoteManifestUrl && remoteManifestUrl.startsWith('https://')) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const upstream = await fetch(remoteManifestUrl, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
        if (upstream.ok) {
          const payload = (await upstream.json()) as Record<string, unknown>;
          return res.json({
            ok: true,
            configured: true,
            latestVersion: String(payload.latestVersion || '1.0.0'),
            versionCode: Number(payload.versionCode || 1),
            releaseNotes: String(payload.releaseNotes || ''),
            apkUrl: String(payload.apkUrl || ''),
            fileSize: Number(payload.fileSize || 0),
            sha256: String(payload.sha256 || '').toLowerCase(),
            mandatory: Boolean(payload.mandatory),
            minSupportedVersionCode: Number(payload.minSupportedVersionCode || 1),
            playStoreUrl:
              typeof payload.playStoreUrl === 'string' && payload.playStoreUrl.trim()
                ? payload.playStoreUrl.trim()
                : 'https://play.google.com/store/apps/details?id=com.lupinmovies.app',
            checkedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Fall through to local environment manifest if remote manifest temporarily fails
      } finally {
        clearTimeout(timer);
      }
    }

    const latestVersion = (process.env.APP_LATEST_VERSION || '1.0.0').trim();
    const versionCode = Number.parseInt(process.env.APP_LATEST_VERSION_CODE || '1', 10) || 1;
    const apkUrl = (process.env.APP_APK_URL || '').trim();
    const fileSize = Number.parseInt(process.env.APP_APK_FILE_SIZE || '0', 10) || 0;
    const sha256 = (process.env.APP_APK_SHA256 || '').trim().toLowerCase();
    const releaseNotes = (process.env.APP_UPDATE_RELEASE_NOTES || '').trim();
    const mandatory = ['1', 'true', 'yes'].includes(
      (process.env.APP_UPDATE_MANDATORY || '').trim().toLowerCase()
    );
    const minSupportedVersionCode =
      Number.parseInt(process.env.APP_MIN_SUPPORTED_VERSION_CODE || '1', 10) || 1;
    const playStoreUrl = (
      process.env.APP_PLAY_STORE_URL ||
      'https://play.google.com/store/apps/details?id=com.lupinmovies.app'
    ).trim();

    return res.json({
      ok: true,
      configured: Boolean(apkUrl && sha256),
      latestVersion,
      versionCode,
      releaseNotes,
      apkUrl,
      fileSize,
      sha256,
      mandatory,
      minSupportedVersionCode,
      playStoreUrl,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    return handleLocalError(res, err);
  }
});

// Structured 404 for unknown /api/local/* endpoints
localRouter.use((req, res) => {
  res.status(404).json({
    ok: false,
    status: 404,
    code: 'ROUTE_NOT_FOUND',
    error: `Unknown local API route: ${req.method} ${req.path}`,
  });
});
