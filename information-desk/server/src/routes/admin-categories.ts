import { Router } from 'express';
import { query, withTransaction } from '../db';
import { ApiError, asyncHandler } from '../lib/http';
import { recordAudit } from '../lib/audit';
import {
  categoryCreateSchema,
  categoryReorderSchema,
  categoryUpdateSchema,
  slugify,
} from '../lib/validators';

export const adminCategoriesRouter = Router();

interface CategoryRow {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  sort_order: number;
  created_at: Date;
  service_count?: string;
  active_service_count?: string;
}

const SELECT_CATEGORY = `
  SELECT c.id, c.key, c.label, c.icon, c.sort_order, c.created_at,
         (SELECT count(*) FROM portal.services s WHERE s.category_id = c.id) AS service_count,
         (SELECT count(*) FROM portal.services s
           WHERE s.category_id = c.id AND s.is_active = true) AS active_service_count
    FROM portal.categories c
`;

function toDto(row: CategoryRow) {
  return {
    id: row.id,
    key: row.key,
    label: row.label,
    icon: row.icon,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    serviceCount: Number(row.service_count ?? 0),
    activeServiceCount: Number(row.active_service_count ?? 0),
  };
}

function requireId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.notFound('No category with that id.');
  }
  return id;
}

/** Ensures a unique slug by appending -2, -3, ... when the base is taken. */
async function uniqueKey(base: string, excludeId?: number): Promise<string> {
  let candidate = base;
  for (let attempt = 2; attempt < 100; attempt += 1) {
    const rows = await query<{ id: number }>(
      'SELECT id FROM portal.categories WHERE key = $1 AND ($2::int IS NULL OR id <> $2)',
      [candidate, excludeId ?? null],
    );
    if (rows.length === 0) return candidate;
    candidate = `${base}-${attempt}`;
  }
  throw ApiError.conflict('Could not derive a unique key for that label.');
}

adminCategoriesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rows = await query<CategoryRow>(
      `${SELECT_CATEGORY} ORDER BY c.sort_order ASC, c.label ASC`,
    );
    res.json({ categories: rows.map(toDto) });
  }),
);

adminCategoriesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const input = categoryCreateSchema.parse(req.body);
    const key = await uniqueKey(input.key ?? slugify(input.label));

    const sortOrder =
      input.sortOrder ??
      (
        await query<{ next: number }>(
          'SELECT COALESCE(MAX(sort_order), 0) + 10 AS next FROM portal.categories',
        )
      )[0].next;

    const [{ id }] = await query<{ id: number }>(
      `INSERT INTO portal.categories (key, label, icon, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [key, input.label, input.icon, sortOrder],
    );

    const [row] = await query<CategoryRow>(`${SELECT_CATEGORY} WHERE c.id = $1`, [id]);
    const dto = toDto(row);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'create',
      entity: 'category',
      entityId: id,
      after: dto,
    });

    res.status(201).json({ category: dto });
  }),
);

adminCategoriesRouter.put(
  '/reorder',
  asyncHandler(async (req, res) => {
    const { ids } = categoryReorderSchema.parse(req.body);

    if (new Set(ids).size !== ids.length) {
      throw ApiError.badRequest('The reorder list contains duplicate ids.');
    }

    const updated = await withTransaction(async (client) => {
      const existing = await client.query(
        'SELECT id FROM portal.categories WHERE id = ANY($1::int[]) FOR UPDATE',
        [ids],
      );
      if (existing.rowCount !== ids.length) {
        throw ApiError.badRequest('Some of those categories no longer exist. Refresh and try again.');
      }

      await client.query(
        `UPDATE portal.categories AS c
            SET sort_order = ordering.position
           FROM (
             SELECT id, (ordinality * 10)::int AS position
               FROM unnest($1::int[]) WITH ORDINALITY AS t(id, ordinality)
           ) AS ordering
          WHERE c.id = ordering.id`,
        [ids],
      );

      await recordAudit(
        {
          adminId: req.admin!.id,
          action: 'update',
          entity: 'category',
          entityId: null,
          after: { reordered: ids },
        },
        client,
      );

      const rows = await client.query<CategoryRow>(
        `${SELECT_CATEGORY} ORDER BY c.sort_order ASC, c.label ASC`,
      );
      return rows.rows;
    });

    res.json({ categories: updated.map(toDto) });
  }),
);

adminCategoriesRouter.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requireId(req.params.id);
    const input = categoryUpdateSchema.parse(req.body);

    const [before] = await query<CategoryRow>(`${SELECT_CATEGORY} WHERE c.id = $1`, [id]);
    if (!before) throw ApiError.notFound('No category with that id.');

    const key = input.key ? await uniqueKey(input.key, id) : undefined;

    const columns: Record<string, unknown> = {
      key,
      label: input.label,
      icon: input.icon,
      sort_order: input.sortOrder,
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
      `UPDATE portal.categories SET ${assignments.join(', ')} WHERE id = $${params.length}`,
      params,
    );

    const [after] = await query<CategoryRow>(`${SELECT_CATEGORY} WHERE c.id = $1`, [id]);
    const dto = toDto(after);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'update',
      entity: 'category',
      entityId: id,
      before: toDto(before),
      after: dto,
    });

    res.json({ category: dto });
  }),
);

/**
 * Hard delete, but only when nothing points at the category. The FK is
 * ON DELETE RESTRICT, so this check is a friendlier version of the constraint
 * rather than the only thing standing in the way.
 */
adminCategoriesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = requireId(req.params.id);

    const [before] = await query<CategoryRow>(`${SELECT_CATEGORY} WHERE c.id = $1`, [id]);
    if (!before) throw ApiError.notFound('No category with that id.');

    const attached = Number(before.service_count ?? 0);
    if (attached > 0) {
      throw ApiError.conflict(
        `"${before.label}" still has ${attached} service${attached === 1 ? '' : 's'} attached. ` +
          'Move them to another category first, then delete it.',
        { serviceCount: attached },
      );
    }

    await query('DELETE FROM portal.categories WHERE id = $1', [id]);

    await recordAudit({
      adminId: req.admin!.id,
      action: 'delete',
      entity: 'category',
      entityId: id,
      before: toDto(before),
    });

    res.json({ ok: true, id });
  }),
);
