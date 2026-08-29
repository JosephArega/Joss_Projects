import { createApp } from './app';
import { assertDatabaseReachable, pool } from './db';
import { env, warnAboutInsecureConfig } from './env';
import { seedFirstAdmin } from './lib/seed-admin';

async function main(): Promise<void> {
  warnAboutInsecureConfig();

  try {
    await assertDatabaseReachable();
  } catch (error) {
    console.error(`\n[boot] ${(error as Error).message}\n`);
    process.exit(1);
  }

  await seedFirstAdmin();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[boot] Information Desk API listening on http://localhost:${env.PORT}`);
    console.log(`[boot] Allowed browser origin: ${env.APP_ORIGIN}`);
  });

  const shutdown = (signal: string) => {
    console.log(`[boot] ${signal} received, shutting down.`);
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
    // Do not let a stuck connection hold the process open forever.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[boot] fatal error:', error);
  process.exit(1);
});
