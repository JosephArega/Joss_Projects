import fs from 'node:fs';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { env } from './env';

function sslConfig(): false | { rejectUnauthorized: boolean; ca?: string } {
  const mode = env.PGSSLMODE;
  if (!mode || mode === 'disable') return false;
  if (mode === 'no-verify' || mode === 'allow' || mode === 'prefer') {
    return { rejectUnauthorized: false };
  }
  const ca = env.PGSSLROOTCERT ? fs.readFileSync(env.PGSSLROOTCERT, 'utf8') : undefined;
  return { rejectUnauthorized: true, ca };
}

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: sslConfig(),
  max: env.PGPOOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // Every connection resolves unqualified names against the app's own schema
  // first; `public` stays on the path so the citext / pgcrypto / pg_trgm
  // extension objects remain reachable.
  options: '-c search_path=portal,public',
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

/** Parameterized query helper. Never interpolate values into SQL text. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params as unknown[]);
  return result.rows;
}

/** Runs `fn` inside a transaction, rolling back on any thrown error. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('[db] rollback failed:', (rollbackError as Error).message);
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Fail fast at boot with an actionable message rather than surfacing a stack
 * trace on the first request.
 */
export async function assertDatabaseReachable(): Promise<void> {
  try {
    const rows = await query<{ ok: number }>('SELECT 1 AS ok');
    if (rows[0]?.ok !== 1) throw new Error('unexpected response from SELECT 1');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const redacted = env.DATABASE_URL.replace(/\/\/([^:]+):[^@]*@/, '//$1:***@');
    throw new Error(
      `Cannot reach PostgreSQL at ${redacted}\n  Reason: ${reason}\n` +
        '  Check that the server is running, the credentials are correct, and that ' +
        'PGSSLMODE matches what the server expects.',
    );
  }

  const [schemaCheck] = await query<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'portal' AND table_name = 'services'
     ) AS present`,
  );
  if (!schemaCheck?.present) {
    throw new Error(
      'Connected to PostgreSQL, but the `portal` schema has not been migrated.\n' +
        '  Run:  npm run migrate',
    );
  }
}
