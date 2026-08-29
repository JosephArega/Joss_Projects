import { Router } from 'express';
import { query } from '../db';
import { asyncHandler } from '../lib/http';
import { auditQuerySchema } from '../lib/validators';

export const adminAuditRouter = Router();

interface AuditRow {
  id: string;
  admin_id: number | null;
  username: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  before_json: unknown;
  after_json: unknown;
  created_at: Date;
}

adminAuditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { page, pageSize } = auditQuerySchema.parse(req.query);
    const offset = (page - 1) * pageSize;

    const [rows, [{ count }]] = await Promise.all([
      query<AuditRow>(
        `SELECT a.id, a.admin_id, ad.username, a.action, a.entity, a.entity_id,
                a.before_json, a.after_json, a.created_at
           FROM portal.audit_log a
           LEFT JOIN portal.admins ad ON ad.id = a.admin_id
          ORDER BY a.created_at DESC, a.id DESC
          LIMIT $1 OFFSET $2`,
        [pageSize, offset],
      ),
      query<{ count: string }>('SELECT count(*) AS count FROM portal.audit_log'),
    ]);

    res.json({
      page,
      pageSize,
      total: Number(count),
      entries: rows.map((row) => ({
        id: String(row.id),
        adminId: row.admin_id,
        username: row.username,
        action: row.action,
        entity: row.entity,
        entityId: row.entity_id,
        before: row.before_json,
        after: row.after_json,
        createdAt: row.created_at,
      })),
    });
  }),
);
