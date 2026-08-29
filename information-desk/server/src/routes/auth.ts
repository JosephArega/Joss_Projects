import { Router } from 'express';
import { query } from '../db';
import { ApiError, asyncHandler } from '../lib/http';
import { recordAudit } from '../lib/audit';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../lib/password';
import { CSRF_COOKIE, clearSession, issueSession } from '../lib/tokens';
import { changePasswordSchema, loginSchema } from '../lib/validators';
import { requireAuth } from '../middleware/auth';
import { GENERIC_LOGIN_FAILURE, loginRateLimiter } from '../middleware/rate-limit';

export const authRouter = Router();

interface AdminRow {
  id: number;
  username: string;
  password_hash: string;
  must_change_password: boolean;
}

/**
 * A dummy verify against a throwaway hash keeps the response time for an
 * unknown username in the same ballpark as a known one, so the endpoint does
 * not leak which usernames exist.
 */
const DUMMY_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.qOMOLDpJC/DUXfXbZaDIzYuMFVDkeUu';

authRouter.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { username, password } = loginSchema.parse(req.body);

    const rows = await query<AdminRow>(
      'SELECT id, username, password_hash, must_change_password FROM portal.admins WHERE username = $1',
      [username],
    );
    const admin = rows[0];

    const passwordMatches = admin
      ? await verifyPassword(admin.password_hash, password)
      : await verifyPassword(DUMMY_HASH, password);

    if (!admin || !passwordMatches) {
      // Deliberately identical for every failure mode: unknown user, wrong
      // password, or a disabled account. Never say which.
      throw ApiError.unauthorized(GENERIC_LOGIN_FAILURE);
    }

    await query('UPDATE portal.admins SET last_login_at = now() WHERE id = $1', [admin.id]);
    await recordAudit({
      adminId: admin.id,
      action: 'login',
      entity: 'admin',
      entityId: admin.id,
      after: { username: admin.username, ip: req.ip },
    });

    const csrfToken = issueSession(res, {
      sub: admin.id,
      username: admin.username,
      mustChangePassword: admin.must_change_password,
    });

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        mustChangePassword: admin.must_change_password,
      },
      csrfToken,
    });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const admin = req.admin!;
    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        mustChangePassword: admin.mustChangePassword,
      },
      csrfToken: req.cookies?.[CSRF_COOKIE] ?? null,
    });
  }),
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const admin = req.admin!;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const rows = await query<Pick<AdminRow, 'password_hash'>>(
      'SELECT password_hash FROM portal.admins WHERE id = $1',
      [admin.id],
    );
    const stored = rows[0];
    if (!stored) throw ApiError.unauthorized();

    if (!(await verifyPassword(stored.password_hash, currentPassword))) {
      throw ApiError.badRequest('Your current password is not correct.');
    }

    if (currentPassword === newPassword) {
      throw ApiError.badRequest('The new password must be different from the current one.');
    }

    const policyError = validatePasswordStrength(newPassword);
    if (policyError) throw ApiError.badRequest(policyError);

    const passwordHash = await hashPassword(newPassword);
    await query(
      'UPDATE portal.admins SET password_hash = $1, must_change_password = false WHERE id = $2',
      [passwordHash, admin.id],
    );

    await recordAudit({
      adminId: admin.id,
      action: 'password_change',
      entity: 'admin',
      entityId: admin.id,
      after: { username: admin.username },
    });

    // Re-issue so the token stops carrying mustChangePassword.
    const csrfToken = issueSession(res, {
      sub: admin.id,
      username: admin.username,
      mustChangePassword: false,
    });

    res.json({
      admin: { id: admin.id, username: admin.username, mustChangePassword: false },
      csrfToken,
    });
  }),
);
