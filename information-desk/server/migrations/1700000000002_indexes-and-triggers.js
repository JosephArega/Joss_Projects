/* eslint-disable camelcase */

/** Supporting indexes and the shared `updated_at` trigger. */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('CREATE INDEX services_category_id_idx ON portal.services (category_id)');
  pgm.sql('CREATE INDEX services_is_active_idx ON portal.services (is_active)');
  pgm.sql('CREATE INDEX services_sort_order_idx ON portal.services (sort_order, name)');
  pgm.sql('CREATE INDEX audit_log_created_at_idx ON portal.audit_log (created_at DESC)');
  pgm.sql('CREATE INDEX categories_sort_order_idx ON portal.categories (sort_order, label)');

  // Search support: trigram indexes make the ILIKE '%term%' filters used by the
  // admin table and the public search cheap, and lower(name) covers exact and
  // prefix lookups.
  pgm.sql('CREATE INDEX services_name_lower_idx ON portal.services (lower(name))');
  pgm.sql('CREATE INDEX services_name_trgm_idx ON portal.services USING gin (name public.gin_trgm_ops)');
  pgm.sql(`
    CREATE INDEX services_description_trgm_idx
      ON portal.services USING gin (description public.gin_trgm_ops)
  `);

  pgm.sql(`
    CREATE OR REPLACE FUNCTION portal.set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $$
  `);

  pgm.sql(`
    CREATE TRIGGER services_set_updated_at
      BEFORE UPDATE ON portal.services
      FOR EACH ROW EXECUTE FUNCTION portal.set_updated_at()
  `);

  pgm.sql(`
    CREATE TRIGGER categories_set_updated_at
      BEFORE UPDATE ON portal.categories
      FOR EACH ROW EXECUTE FUNCTION portal.set_updated_at()
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS categories_set_updated_at ON portal.categories');
  pgm.sql('DROP TRIGGER IF EXISTS services_set_updated_at ON portal.services');
  pgm.sql('DROP FUNCTION IF EXISTS portal.set_updated_at()');

  pgm.sql('DROP INDEX IF EXISTS portal.services_description_trgm_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.services_name_trgm_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.services_name_lower_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.categories_sort_order_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.audit_log_created_at_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.services_sort_order_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.services_is_active_idx');
  pgm.sql('DROP INDEX IF EXISTS portal.services_category_id_idx');
};
