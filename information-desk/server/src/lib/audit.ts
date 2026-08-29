import type { PoolClient } from 'pg';
import { query } from '../db';

export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'password_change';
export type AuditEntity = 'service' | 'category' | 'admin';

export interface AuditEntry {
  adminId: number | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | number | null;
  before?: unknown;
  after?: unknown;
}

const SQL = `
  INSERT INTO portal.audit_log (admin_id, action, entity, entity_id, before_json, after_json)
  VALUES ($1, $2, $3, $4, $5, $6)
`;

/**
 * Appends an audit row. Pass `client` when the write belongs to an open
 * transaction so the log entry commits or rolls back with the change itself.
 *
 * Auditing must never take down the request that succeeded, so failures here
 * are logged rather than thrown — except inside a transaction, where the
 * caller has explicitly asked for atomicity.
 */
export async function recordAudit(entry: AuditEntry, client?: PoolClient): Promise<void> {
  const params = [
    entry.adminId,
    entry.action,
    entry.entity,
    entry.entityId === null || entry.entityId === undefined ? null : String(entry.entityId),
    entry.before === undefined ? null : JSON.stringify(entry.before),
    entry.after === undefined ? null : JSON.stringify(entry.after),
  ];

  if (client) {
    await client.query(SQL, params);
    return;
  }

  try {
    await query(SQL, params);
  } catch (error) {
    console.error('[audit] failed to record entry:', (error as Error).message, entry);
  }
}
