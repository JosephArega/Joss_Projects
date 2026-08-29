import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';
import { z } from 'zod';

// Load server/.env when present. Production deployments normally inject real
// environment variables instead (systemd EnvironmentFile, docker-compose, ...).
const envFile = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}

const booleanish = (defaultValue: boolean) =>
  z
    .string()
    .optional()
    .transform((raw) => {
      if (raw === undefined || raw.trim() === '') return defaultValue;
      return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
    });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65535).default(4000),

  APP_ORIGIN: z
    .string()
    .url('APP_ORIGIN must be an absolute URL, e.g. https://desk.example.org')
    .default('http://localhost:5173'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required, e.g. postgres://user:pass@host:5432/portal'),
  PGSSLMODE: z
    .enum(['disable', 'no-verify', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'])
    .optional(),
  PGSSLROOTCERT: z.string().optional(),
  PGPOOL_MAX: z.coerce.number().int().positive().max(100).default(10),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48'),
  SESSION_HOURS: z.coerce.number().positive().max(72).default(8),
  COOKIE_SECURE: booleanish(true),

  ADMIN_USERNAME: z.string().trim().min(1).max(64).optional(),
  ADMIN_INITIAL_PASSWORD: z.string().min(8).optional(),

  ORG_NAME: z.string().trim().min(1).default('Information Desk'),
  SUPPORT_EMAIL: z.string().trim().default('servicedesk@example.org'),
  SUPPORT_PHONE: z.string().trim().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  console.error(
    `\nInformation Desk cannot start: the environment is not configured correctly.\n\n${details}\n\n` +
      `Copy server/.env.example to server/.env and fill in the missing values.\n`,
  );
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';

/**
 * The auth cookie carries the Secure flag by default, which means browsers
 * refuse to send it over plain http. Warn loudly rather than letting an
 * operator wonder why every request looks logged out.
 */
export function warnAboutInsecureConfig(): void {
  if (isProduction && !env.COOKIE_SECURE) {
    console.warn(
      '[config] COOKIE_SECURE=false in production — the session cookie will travel unencrypted. Use this only behind a trusted TLS terminator.',
    );
  }
  if (isProduction && env.COOKIE_SECURE && env.APP_ORIGIN.startsWith('http://')) {
    console.warn(
      `[config] APP_ORIGIN is ${env.APP_ORIGIN} but the session cookie is Secure, so browsers will not send it over http. Serve the portal over https, or set COOKIE_SECURE=false behind a trusted TLS terminator.`,
    );
  }
}
