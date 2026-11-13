import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import { localRouter } from '../server/routes/localRoutes.ts';

const app = express();
app.set('trust proxy', true);
app.use((req, _res, next) => {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try {
        req.body = req.body ? JSON.parse(req.body) : {};
      } catch {
        // leave raw string
      }
    } else if (Buffer.isBuffer(req.body)) {
      try {
        const text = req.body.toString('utf8');
        req.body = text ? JSON.parse(text) : {};
      } catch {
        // leave raw buffer
      }
    }
    (req as unknown as { _body?: boolean })._body = true;
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use('/', localRouter);

function normalizeRewriteUrl(rawUrl: string | undefined): string {
  const parsed = new URL(rawUrl || '/', 'http://localhost');
  const rewrittenPath = parsed.searchParams.get('__local_path');
  if (rewrittenPath !== null) {
    parsed.searchParams.delete('__local_path');
    const cleanSubPath = '/' + rewrittenPath.replace(/^\/+/, '');
    const qs = parsed.searchParams.toString();
    return qs ? `${cleanSubPath}?${qs}` : cleanSubPath;
  }
  if (parsed.pathname === '/api/local' || parsed.pathname.startsWith('/api/local/')) {
    const sub = parsed.pathname.slice('/api/local'.length) || '/';
    return `${sub}${parsed.search}`;
  }
  return `${parsed.pathname}${parsed.search}`;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  req.url = normalizeRewriteUrl(req.url);
  return app(req as unknown as express.Request, res as unknown as express.Response);
}
