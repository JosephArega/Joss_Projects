import bcrypt from 'bcryptjs';

type Argon2Module = {
  hash: (plain: string, options: Record<string, unknown>) => Promise<string>;
  verify: (hash: string, plain: string) => Promise<boolean>;
  argon2id: number;
};

/**
 * argon2id is the intended hash. The native module needs a build toolchain, so
 * if it is unavailable we fall back to bcrypt rather than refusing to boot.
 * Stored hashes are self-describing ($argon2id$... vs $2a$...), so both
 * algorithms coexist and old hashes keep verifying after a switch.
 */
let argon2: Argon2Module | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  argon2 = require('argon2') as Argon2Module;
} catch {
  console.warn('[auth] argon2 unavailable — falling back to bcrypt for password hashing.');
  argon2 = null;
}

export const passwordAlgorithm = () => (argon2 ? 'argon2id' : 'bcrypt');

const ARGON2_OPTIONS = {
  type: 2, // argon2id
  memoryCost: 19_456, // 19 MiB — OWASP baseline
  timeCost: 2,
  parallelism: 1,
};

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  if (argon2) {
    return argon2.hash(plain, { ...ARGON2_OPTIONS, type: argon2.argon2id });
  }
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    if (hash.startsWith('$argon2')) {
      if (!argon2) {
        console.error('[auth] stored hash is argon2 but the argon2 module is unavailable.');
        return false;
      }
      return await argon2.verify(hash, plain);
    }
    return await bcrypt.compare(plain, hash);
  } catch (error) {
    console.error('[auth] password verification failed:', (error as Error).message);
    return false;
  }
}

/**
 * Password policy for admin-chosen passwords. Deliberately modest: length is
 * what matters, and rules that are too fussy push people towards Post-its.
 */
export function describePasswordPolicy(): string {
  return 'Passwords must be at least 12 characters long and contain a letter and a number.';
}

export function validatePasswordStrength(plain: string): string | null {
  if (plain.length < 12) return describePasswordPolicy();
  if (!/[A-Za-z]/.test(plain) || !/\d/.test(plain)) return describePasswordPolicy();
  return null;
}
