import { Router } from 'express';
import { pool, query } from '../db';
import { asyncHandler } from '../lib/http';
import { env } from '../env';

export const publicRouter = Router();

interface CategoryRow {
  id: number;
  key: string;
  label: string;
  icon: string | null;
  sort_order: number;
}

interface ServiceRow {
  id: string;
  name: string;
  url: string;
  category_id: number;
  description: string | null;
  icon: string | null;
  sort_order: number;
  updated_at: Date;
}

/**
 * The whole public payload in one round trip: active services plus the
 * categories they belong to. Categories with no active services are still
 * returned so the tab strip stays stable.
 */
publicRouter.get(
  '/services',
  asyncHandler(async (_req, res) => {
    const [categories, services] = await Promise.all([
      query<CategoryRow>(
        `SELECT id, key, label, icon, sort_order
           FROM portal.categories
          ORDER BY sort_order ASC, label ASC`,
      ),
      // Grouped by category first so the "All" tab reads as a directory
      // rather than an interleaved list; the admin's own ordering decides the
      // sequence within each group.
      query<ServiceRow>(
        `SELECT s.id, s.name, s.url, s.category_id, s.description, s.icon,
                s.sort_order, s.updated_at
           FROM portal.services s
           JOIN portal.categories c ON c.id = s.category_id
          WHERE s.is_active = true
          ORDER BY c.sort_order ASC, c.label ASC, s.sort_order ASC, s.name ASC`,
      ),
    ]);

    const lastUpdated = services.reduce<Date | null>((latest, service) => {
      const candidate = new Date(service.updated_at);
      return !latest || candidate > latest ? candidate : latest;
    }, null);

    res.json({
      organization: {
        name: env.ORG_NAME,
        supportEmail: env.SUPPORT_EMAIL,
        supportPhone: env.SUPPORT_PHONE || null,
      },
      lastUpdated: lastUpdated ? lastUpdated.toISOString() : null,
      categories: categories.map((category) => ({
        id: category.id,
        key: category.key,
        label: category.label,
        icon: category.icon,
        sortOrder: category.sort_order,
      })),
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        url: service.url,
        categoryId: service.category_id,
        description: service.description,
        icon: service.icon,
        sortOrder: service.sort_order,
      })),
    });
  }),
);

/** Liveness plus a real database round trip. */
publicRouter.get(
  '/health',
  asyncHandler(async (_req, res) => {
    const startedAt = Date.now();
    try {
      await query('SELECT 1');
      res.json({
        status: 'ok',
        database: 'reachable',
        latencyMs: Date.now() - startedAt,
        pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
        uptimeSeconds: Math.round(process.uptime()),
      });
    } catch (error) {
      res.status(503).json({
        status: 'degraded',
        database: 'unreachable',
        error: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }),
);
