/**
 * CLI: add an administrator.
 *
 *   npm run create-admin -- --username alice
 *   npm run create-admin -- --username alice --password 'correct horse battery'
 *
 * With no --password the script prompts for one without echoing it. The new
 * account is always created with must_change_password = true unless
 * --no-force-change is passed.
 */
import readline from 'node:readline';
import { Writable } from 'node:stream';
import { pool, query } from '../db';
import { hashPassword, validatePasswordStrength } from '../lib/password';
import { recordAudit } from '../lib/audit';

interface Args {
  username?: string;
  password?: string;
  forceChange: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { forceChange: true };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--username' || token === '-u') args.username = argv[++i];
    else if (token === '--password' || token === '-p') args.password = argv[++i];
    else if (token === '--no-force-change') args.forceChange = false;
    else if (token === '--help' || token === '-h') {
      console.log(
        'Usage: npm run create-admin -- --username <name> [--password <password>] [--no-force-change]',
      );
      process.exit(0);
    }
  }
  return args;
}

/** Reads a line from stdin without echoing the characters back. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    let muted = false;
    const mutedOutput = new Writable({
      write(chunk, _encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      },
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutedOutput,
      terminal: true,
    });

    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
    muted = true;
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const username = (args.username ?? '').trim();
  if (!username) {
    console.error('A username is required:  npm run create-admin -- --username alice');
    process.exit(1);
  }

  const existing = await query('SELECT 1 FROM portal.admins WHERE username = $1', [username]);
  if (existing.length > 0) {
    console.error(`An administrator called "${username}" already exists.`);
    process.exit(1);
  }

  let password = args.password;
  if (!password) {
    password = await promptHidden(`Password for ${username}: `);
    const confirmation = await promptHidden('Confirm password: ');
    if (password !== confirmation) {
      console.error('The two passwords did not match.');
      process.exit(1);
    }
  }

  const policyError = validatePasswordStrength(password);
  if (policyError) {
    console.error(policyError);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);
  const [admin] = await query<{ id: number }>(
    `INSERT INTO portal.admins (username, password_hash, must_change_password)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [username, passwordHash, args.forceChange],
  );

  await recordAudit({
    adminId: admin.id,
    action: 'create',
    entity: 'admin',
    entityId: admin.id,
    after: { username, mustChangePassword: args.forceChange, createdVia: 'cli' },
  });

  console.log(
    `Created administrator "${username}"${
      args.forceChange ? ' — they will be asked to change this password at first login.' : '.'
    }`,
  );
}

main()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('create-admin failed:', error instanceof Error ? error.message : error);
    await pool.end().catch(() => undefined);
    process.exit(1);
  });
