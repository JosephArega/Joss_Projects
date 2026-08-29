import { query } from '../db';
import { env } from '../env';
import { hashPassword, passwordAlgorithm } from './password';
import { recordAudit } from './audit';

/**
 * Creates the first administrator from ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD
 * when the admins table is empty.
 *
 * This runs only on an empty table: it never resets an existing password, so
 * leaving the variables in the environment after first boot is harmless.
 * `must_change_password` is true, which locks the dashboard until the initial
 * password has been replaced.
 */
export async function seedFirstAdmin(): Promise<void> {
  const [{ count }] = await query<{ count: string }>(
    'SELECT count(*) AS count FROM portal.admins',
  );

  if (Number(count) > 0) return;

  if (!env.ADMIN_USERNAME || !env.ADMIN_INITIAL_PASSWORD) {
    console.warn(
      '[auth] No administrators exist yet and ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD are not set.\n' +
        '       Set them and restart, or run: npm run create-admin',
    );
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_INITIAL_PASSWORD);
  const [admin] = await query<{ id: number; username: string }>(
    `INSERT INTO portal.admins (username, password_hash, must_change_password)
     VALUES ($1, $2, true)
     ON CONFLICT (username) DO NOTHING
     RETURNING id, username`,
    [env.ADMIN_USERNAME, passwordHash],
  );

  if (!admin) return;

  await recordAudit({
    adminId: admin.id,
    action: 'create',
    entity: 'admin',
    entityId: admin.id,
    after: { username: admin.username, seeded: true },
  });

  console.log(
    `[auth] Seeded first administrator "${admin.username}" (${passwordAlgorithm()}). ` +
      'The initial password must be changed at first login.',
  );
}
