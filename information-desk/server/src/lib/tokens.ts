import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../env';

export const SESSION_COOKIE = 'id_session';
export const CSRF_COOKIE = 'id_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export interface SessionClaims {
  sub: number;
  username: string;
  mustChangePassword: boolean;
}

const sessionSeconds = () => Math.round(env.SESSION_HOURS * 3600);

export function signSession(claims: SessionClaims): string {
  // `sub` travels in the payload itself, so the `subject` option is not set:
  // jsonwebtoken rejects a signing call that would define it twice.
  return jwt.sign(claims, env.JWT_SECRET, {
    expiresIn: sessionSeconds(),
    issuer: 'information-desk',
  });
}

export function verifySession(token: string): SessionClaims | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { issuer: 'information-desk' });
    if (typeof payload === 'string') return null;
    const sub = Number(payload.sub);
    if (!Number.isInteger(sub)) return null;
    return {
      sub,
      username: String(payload.username ?? ''),
      mustChangePassword: Boolean(payload.mustChangePassword),
    };
  } catch {
    return null;
  }
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.COOKIE_SECURE,
    path: '/',
    maxAge: sessionSeconds() * 1000,
  };
}

/**
 * Issues the session cookie plus the double-submit CSRF cookie.
 *
 * The session cookie is httpOnly so script can never read the JWT — it is
 * never placed in localStorage. The CSRF cookie is deliberately readable by
 * script: the client echoes it back in a header, and the server checks that
 * the two match.
 */
export function issueSession(
  res: Response,
  claims: SessionClaims,
  reuseCsrfToken?: string | null,
): string {
  const token = signSession(claims);
  res.cookie(SESSION_COOKIE, token, baseCookieOptions());

  // The CSRF token is kept stable for the life of the session and only minted
  // afresh at login and after a password change. Rotating it on every sliding
  // refresh would race the client: a page that read the cookie a moment before
  // sending a request would echo a value the browser had already replaced.
  const csrfToken = isPlausibleCsrfToken(reuseCsrfToken)
    ? reuseCsrfToken
    : crypto.randomBytes(32).toString('base64url');

  res.cookie(CSRF_COOKIE, csrfToken, { ...baseCookieOptions(), httpOnly: false });
  return csrfToken;
}

/** Guards against a caller re-issuing a truncated or tampered cookie value. */
function isPlausibleCsrfToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export function clearSession(res: Response): void {
  const options: CookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: env.COOKIE_SECURE,
    path: '/',
  };
  res.clearCookie(SESSION_COOKIE, options);
  res.clearCookie(CSRF_COOKIE, { ...options, httpOnly: false });
}

/** Constant-time string comparison that tolerates differing lengths. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so the timing does not leak the length.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
