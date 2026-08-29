import type { NextFunction, Request, RequestHandler, Response } from 'express';

/** An error carrying the HTTP status the client should see. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, 'bad_request', details);
  }
  static unauthorized(message = 'Authentication required.') {
    return new ApiError(401, message, 'unauthorized');
  }
  static forbidden(message = 'Not allowed.') {
    return new ApiError(403, message, 'forbidden');
  }
  static notFound(message = 'Not found.') {
    return new ApiError(404, message, 'not_found');
  }
  static conflict(message: string, details?: unknown) {
    return new ApiError(409, message, 'conflict', details);
  }
}

/** Wraps an async handler so rejected promises reach the error middleware. */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
