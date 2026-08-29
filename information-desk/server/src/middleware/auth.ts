import type { NextFunction, Request, Response } from 'express';
import { query } from '../db';
import { ApiError } from '../lib/http';
import { CSRF_COOKIE, SESSION_COOKIE, issueSession, verifySession } from '../lib/tokens';

export interface AuthenticatedAdmin {
  id: number;
  username: string;
  mustChangePassword: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AuthenticatedAdmin;
    }
  }
}

/**
 * Verifies the session cookie, re-reads the admin row (so a deleted admin or a
 * freshly required password change takes effect immediately rather than at
 * token expiry), and slides the session forward on activity.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token || typeof token !== 'string') {
      throw ApiError.unauthorized();
    }

    const claims = verifySession(token);
    if (!claims) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    const rows = await query<{ id: number; username: string; must_change_password: boolean }>(
      'SELECT id, username, must_change_password FROM portal.admins WHERE id = $1',
      [claims.sub],
    );
    const admin = rows[0];
    if (!admin) {
      throw ApiError.unauthorized('Your session has expired. Please sign in again.');
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      mustChangePassword: admin.must_change_password,
    };

    // Sliding refresh: every authenticated request pushes the expiry out. The
    // existing CSRF token is carried over rather than regenerated.
    issueSession(
      res,
      {
        sub: admin.id,
        username: admin.username,
        mustChangePassword: admin.must_change_password,
      },
      req.cookies?.[CSRF_COOKIE],
    );

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Blocks the admin surface until a forced password change is done. Applied on
 * top of `requireAuth` for everything except /auth/me, /auth/logout and
 * /auth/change-password itself.
 */
export function requirePasswordChanged(req: Request, _res: Response, next: NextFunction): void {
  if (req.admin?.mustChangePassword) {
    next(new ApiError(403, 'You must change your password before continuing.', 'password_change_required'));
    return;
  }
  next();
}
