import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../lib/http';
import { CSRF_COOKIE, CSRF_HEADER, safeEqual } from '../lib/tokens';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF check.
 *
 * On login the server sets a random, script-readable `id_csrf` cookie
 * alongside the httpOnly session cookie. The client echoes that value in the
 * X-CSRF-Token header on every mutating request. A cross-site attacker can
 * cause the cookie to be sent but cannot read it to populate the header.
 */
export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerValue = req.get(CSRF_HEADER);

  if (typeof cookieToken !== 'string' || cookieToken.length === 0) {
    next(new ApiError(403, 'Missing CSRF cookie. Sign in again and retry.', 'csrf_missing'));
    return;
  }

  if (typeof headerValue !== 'string' || headerValue.length === 0) {
    next(new ApiError(403, 'Missing CSRF token header.', 'csrf_missing'));
    return;
  }

  if (!safeEqual(cookieToken, headerValue)) {
    next(new ApiError(403, 'CSRF token mismatch.', 'csrf_mismatch'));
    return;
  }

  next();
}
