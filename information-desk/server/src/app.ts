import path from 'node:path';
import fs from 'node:fs';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env, isProduction } from './env';
import { errorHandler, notFoundHandler } from './middleware/errors';
import { csrfProtection } from './middleware/csrf';
import { requireAuth, requirePasswordChanged } from './middleware/auth';
import { apiRateLimiter } from './middleware/rate-limit';
import { publicRouter } from './routes/public';
import { authRouter } from './routes/auth';
import { adminServicesRouter } from './routes/admin-services';
import { adminCategoriesRouter } from './routes/admin-categories';
import { adminAuditRouter } from './routes/admin-audit';

/** Where the built client lands: <repo>/client/dist */
export const CLIENT_DIST = path.resolve(__dirname, '..', '..', 'client', 'dist');

export function createApp(): Express {
  const app = express();

  // Behind nginx: trust exactly one proxy hop so req.ip is the real client
  // address (the rate limiter depends on it) without letting a client spoof
  // an arbitrary X-Forwarded-For chain.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          // Vue's runtime template compiler is not used, but PrimeVue injects
          // its theme as a <style> element at runtime.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          // Service links open in a new tab; nothing is ever framed in.
          frameSrc: ["'none'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: isProduction ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hsts: isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    }),
  );

  app.use(
    cors({
      origin: [env.APP_ORIGIN],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );

  app.use(express.json({ limit: '64kb' }));
  app.use(cookieParser());

  const api = express.Router();
  api.use(apiRateLimiter);
  api.use(publicRouter);
  api.use('/auth', csrfProtectionExceptLogin(), authRouter);

  const admin = express.Router();
  admin.use(csrfProtection, requireAuth, requirePasswordChanged);
  admin.use('/services', adminServicesRouter);
  admin.use('/categories', adminCategoriesRouter);
  admin.use('/audit', adminAuditRouter);
  api.use('/admin', admin);

  app.use('/api', api);
  app.use('/api', notFoundHandler);

  serveClient(app);

  app.use(errorHandler);
  return app;
}

/**
 * Login is the one mutating route that cannot carry a CSRF token, because the
 * cookie pair does not exist yet. It is protected instead by SameSite=Strict
 * on the resulting cookies, the origin-locked CORS policy, and the per-IP rate
 * limit. Every other /auth route goes through the double-submit check.
 */
function csrfProtectionExceptLogin(): express.RequestHandler {
  return (req, res, next) => {
    if (req.method === 'POST' && (req.path === '/login' || req.path === '/login/')) {
      next();
      return;
    }
    csrfProtection(req, res, next);
  };
}

/**
 * In production one Node process serves both the API and the built SPA. In
 * development Vite serves the client on its own port and proxies /api here, so
 * a missing dist folder is expected and must not crash the server.
 */
function serveClient(app: Express): void {
  const indexHtml = path.join(CLIENT_DIST, 'index.html');

  if (!fs.existsSync(indexHtml)) {
    if (isProduction) {
      console.warn(
        `[static] ${CLIENT_DIST} has no index.html. Run "npm run build" before starting in production.`,
      );
    }
    return;
  }

  app.use(
    express.static(CLIENT_DIST, {
      index: false,
      maxAge: '1h',
      setHeaders: (res, filePath) => {
        // Vite emits content-hashed asset filenames, so those are immutable.
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  // History fallback for the SPA router. /api/* never reaches here.
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(indexHtml);
  });
}
