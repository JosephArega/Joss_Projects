import { Router } from 'express';
import { query, withTransaction } from '../db';
import { ApiError, asyncHandler } from '../lib/http';
import { recordAudit } from '../lib/audit';
import {
  serviceCreateSchema,
  serviceReorderSchema,
  serviceUpdateSchema,
} from '../lib/validators';

export const adminServicesRouter = Router();

interface ServiceRow {
  id: string;
  name: string;
  url: string;
  category_id: number;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  category_label?: string;
  category_key?: string;
}

const SELECT_SERVICE = `
  SELECT s.id, s.name, s.url, s.category_id, s.description, s.icon,
         s.sort_order, s.is_active, s.created_at, s.updated_at,
         c.label AS category_label, c.key AS category_key
    FROM portal.services s
    JOIN portal.categories c ON c.id = s.category_id
`;

function toDto(row: ServiceRow) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    categoryId: row.category_id,
    categoryLabel: row.category_label ?? null,
    categoryKey: row.category_key ?? null,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireUuid(id: string): string {
  if (!UUID_PATTERN.test(id)) {
    throw ApiError.notFound('No service with that id.');
  }
  return id;
}

async function assertCategoryExists(categoryId: number): Promise<void> {
  const rows = await query('SELECT 1 FROM portal.categories WHERE id = $1', [categoryId]);
  if (rows.length === 0) {
    throw ApiError.badRequest('That category no longer exists. Pick another one.');
  }
}

/** Admin listing includes inactive rows; the public endpoint does not. */
adminServicesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query<ServiceRow>(
      `${SELECT_SERVICE} ORDER BY s.sort_order ASC, s.name ASC`,
    );
    res.json({ services: rows.map(toDto) });
  }),
);

adminServicesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = serviceCreateSchema.parse(req.body);
    await assertCategoryExists(input.categoryId);

    // Default new rows to the end of their category rather than the top.
    const sortOrder =
      input.sortOrder ??
      (
        await query<{ next: number }>(
          `SELECT COALESCE(MAX(sort_order), 0) + 10 AS next
             FROM portal.services WHERE category_id = $1`,
          [input.categoryId],
        )
      )[0].next;

    const inserted = await query<ServiceRow>(
      `INSERT INTO portal.services (name, url, category_id, description, icon, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        input.name,
        input.url,
        input.categoryId,
        input.description,
        input.icon,
        sortOrder,
        input.isActive ?? true,
      ],
    );

    const [row] = await query<ServiceRow>(`${SELECT_SERVICE} WHERE s.id = $1`, [inserted[0].id]);
    const dto = toDto(row);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'create',
      entity: 'service',
      entityId: dto.id,
      after: dto,
    });

    res.status(201).json({ service: dto });
  }),
);

adminServicesRouter.put(
  '/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = serviceReorderSchema.parse(req.body);

    if (new Set(ids).size !== ids.length) {
      throw ApiError.badRequest('The reorder list contains duplicate ids.');
    }

    const updated = await withTransaction(async (client) => {
      // Lock the rows for the duration so two concurrent drags cannot
      // interleave and leave a half-applied ordering.
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM portal.services WHERE id = ANY($1::uuid[]) FOR UPDATE',
        [ids],
      );
      if (existing.rowCount !== ids.length) {
        throw ApiError.badRequest('Some of those services no longer exist. Refresh and try again.');
      }

      await client.query(
        `UPDATE portal.services AS s
            SET sort_order = ordering.position
           FROM (
             SELECT id, (ordinality * 10)::int AS position
               FROM unnest($1::uuid[]) WITH ORDINALITY AS t(id, ordinality)
           ) AS ordering
          WHERE s.id = ordering.id`,
        [ids],
      );

      await recordAudit(
        {
          adminId: req.admin!.id,
          action: 'update',
          entity: 'service',
          entityId: null,
          after: { reordered: ids },
        },
        client,
      );

      const rows = await client.query<ServiceRow>(
        `${SELECT_SERVICE} ORDER BY s.sort_order ASC, s.name ASC`,
      );
      return rows.rows;
    });

    res.json({ services: updated.map(toDto) });
  }),
);

adminServicesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id);
    const input = serviceUpdateSchema.parse(req.body);

    const [before] = await query<ServiceRow>(`${SELECT_SERVICE} WHERE s.id = $1`, [id]);
    if (!before) throw ApiError.notFound('No service with that id.');

    if (input.categoryId !== undefined) {
      await assertCategoryExists(input.categoryId);
    }

    // Build the SET list from the fields actually supplied. Column names come
    // from this fixed map, never from request keys, and values stay bound.
    const columns: Record<string, unknown> = {
      name: input.name,
      url: input.url,
      category_id: input.categoryId,
      description: input.description,
      icon: input.icon,
      sort_order: input.sortOrder,
      is_active: input.isActive,
    };

    const assignments: string[] = [];
    const params: unknown[] = [];
    for (const [column, value] of Object.entries(columns)) {
      if (value === undefined) continue;
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    }

    if (assignments.length === 0) {
      throw ApiError.badRequest('Nothing to update.');
    }

    params.push(id);
    await query(
      `UPDATE portal.services SET ${assignments.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    const [after] = await query<ServiceRow>(`${SELECT_SERVICE} WHERE s.id = $1`, [id]);
    const dto = toDto(after);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'update',
      entity: 'service',
      entityId: id,
      before: toDto(before),
      after: dto,
    });

    res.json({ service: dto });
  }),
);

/** Soft delete: the row stays for audit and can be re-activated. */
adminServicesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requireUuid(req.params.id);

    const [before] = await query<ServiceRow>(`${SELECT_SERVICE} WHERE s.id = $1`, [id]);
    if (!before) throw ApiError.notFound('No service with that id.');

    if (!before.is_active) {
      res.json({ service: toDto(before), alreadyInactive: true });
      return;
    }

    await query('UPDATE portal.services SET is_active = false WHERE id = $1', [id]);
    const [after] = await query<ServiceRow>(`${SELECT_SERVICE} WHERE s.id = $1`, [id]);
    const dto = toDto(after);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'delete',
      entity: 'service',
      entityId: id,
      before: toDto(before),
      after: dto,
    });

    res.json({ service: dto });
  }),
);
