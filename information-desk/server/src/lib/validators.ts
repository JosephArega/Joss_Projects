import { z } from 'zod';

/**
 * Service URLs are rendered as `<a href>` on a public page, so anything other
 * than a real http(s) destination is rejected outright: javascript:, data:,
 * file:, vbscript:, blob: and bare relative paths.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Control characters are a classic way to smuggle a broken-up "java\nscript:"
 * past a naive prefix check, so they are rejected before the URL is parsed at
 * all. Checked by code point rather than by regex literal so the rule stays
 * readable in source.
 */
function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function normalizeServiceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === '') {
    throw new Error('A URL is required.');
  }

  if (containsControlCharacters(trimmed)) {
    throw new Error('The URL contains invalid control characters.');
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(
      'Enter a full URL including http:// or https:// - relative paths are not allowed.',
    );
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Only http:// and https:// links are allowed (got "${parsed.protocol}").`);
  }

  if (!parsed.hostname) {
    throw new Error('The URL must include a hostname.');
  }

  return parsed.toString();
}

export const serviceUrlSchema = z
  .string()
  .max(2048, 'That URL is too long (2048 characters maximum).')
  .superRefine((value, ctx) => {
    try {
      normalizeServiceUrl(value);
    } catch (error) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: (error as Error).message });
    }
  })
  .transform((value) => normalizeServiceUrl(value));

/**
 * PrimeIcons class name, e.g. "pi pi-server". Empty means "use initials".
 *
 * Accepts an explicit null as well as an omitted field: the admin form clears
 * an icon by sending `icon: null`, and that has to mean the same thing as
 * "no icon" rather than failing validation.
 */
export const iconSchema = z
  .string()
  .trim()
  .max(64)
  .regex(/^(pi pi-[a-z0-9-]+)?$/, 'Icon must be a PrimeIcons class such as "pi pi-server".')
  .nullish()
  .transform((value) => (value ? value : null));

/** Optional free text: an empty string, an omitted field and null all mean null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => (value && value.length > 0 ? value : null));

export const serviceCreateSchema = z.object({
  name: z.string().trim().min(1, 'A name is required.').max(120),
  url: serviceUrlSchema,
  categoryId: z.coerce.number().int().positive('Choose a category.'),
  description: optionalText(280),
  icon: iconSchema,
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
  isActive: z.boolean().optional(),
});

export const serviceUpdateSchema = serviceCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export const categoryCreateSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, 'A key is required.')
    .max(64)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Key must be a lowercase slug, e.g. "core-systems".')
    .optional(),
  label: z.string().trim().min(1, 'A label is required.').max(80),
  icon: iconSchema,
  sortOrder: z.coerce.number().int().min(0).max(100000).optional(),
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update.' });

export const serviceReorderSchema = z.object({
  ids: z.array(z.string().uuid('Each id must be a service UUID.')).min(1).max(1000),
});

export const categoryReorderSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1).max(1000),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(512),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(512),
  newPassword: z.string().min(1).max(512),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

/** Derives a URL-safe slug from a human label, used when no key is supplied. */
export function slugify(label: string): string {
  const withoutDiacritics = Array.from(label.normalize('NFKD'))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      // Strip the combining diacritical marks block left behind by NFKD.
      return code < 0x0300 || code > 0x036f;
    })
    .join('');

  const slug = withoutDiacritics
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .slice(0, 64)
    .replace(/-+$/, '');

  return slug || 'category';
}
