import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../lib/http';
import { isProduction } from '../env';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `No API route matches ${req.method} ${req.path}`, code: 'not_found' });
}

interface PgError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Some fields need attention.',
      code: 'validation_failed',
      fields: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const pgError = err as PgError;
  if (pgError?.code === '23505') {
    res.status(409).json({ error: 'That value is already in use.', code: 'duplicate' });
    return;
  }
  if (pgError?.code === '23503') {
    res.status(409).json({ error: 'That record is still referenced by other rows.', code: 'in_use' });
    return;
  }

  console.error(`[api] unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({
    error: 'Something went wrong on our side. Please try again.',
    code: 'internal_error',
    ...(isProduction ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}
