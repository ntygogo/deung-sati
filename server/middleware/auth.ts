import type { Request, Response, NextFunction } from 'express';
import { authService, type UserRecord } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: UserRecord;
}

export const SESSION_COOKIE_NAME = 'deung_sati_session';

export function setSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res: Response): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
  });
}

function extractToken(req: Request): { token: string; fromCookie: boolean } {
  // 1. Check HttpOnly cookie first
  if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
    return { token: req.cookies[SESSION_COOKIE_NAME], fromCookie: true };
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return { token: authHeader.slice(7).trim(), fromCookie: false };
  }

  // 3. Check custom header x-session-token
  const customHeader = req.headers['x-session-token'] as string;
  if (customHeader) {
    return { token: customHeader.trim(), fromCookie: false };
  }

  return { token: '', fromCookie: false };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const { token, fromCookie } = extractToken(req);

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Authentication token or valid session required' });
    return;
  }

  // CSRF Defense for Cookie-authenticated mutating requests
  if (fromCookie && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const customHeader = req.headers['x-requested-with'] || req.headers['x-deungsati-client'];
    if (!customHeader) {
      // Browser cross-origin form submission cannot set custom headers without preflight
      res.status(403).json({ error: 'Forbidden: CSRF protection validation failed' });
      return;
    }
  }

  try {
    const authResult = await authService.validateSession(token);
    if (!authResult) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    req.userId = authResult.user.id;
    req.user = authResult.user;
    next();
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication verification failed', details: err.message });
  }
}

export async function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> {
  const { token } = extractToken(req);

  if (token) {
    try {
      const authResult = await authService.validateSession(token);
      if (authResult) {
        req.userId = authResult.user.id;
        req.user = authResult.user;
      }
    } catch {
      // Ignore errors for optional auth
    }
  }
  next();
}
