/* eslint-disable camelcase */

/** Core tables: categories, services, admins, audit_log. */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE portal.categories (
      id          serial PRIMARY KEY,
      key         text UNIQUE NOT NULL,
      label       text NOT NULL,
      icon        text,
      sort_order  integer NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE TABLE portal.services (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name        text NOT NULL,
      url         text NOT NULL,
      category_id integer NOT NULL
                    REFERENCES portal.categories(id) ON DELETE RESTRICT,
      description text,
      icon        text,
      sort_order  integer NOT NULL DEFAULT 0,
      is_active   boolean NOT NULL DEFAULT true,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE TABLE portal.admins (
      id                   serial PRIMARY KEY,
      username             public.citext UNIQUE NOT NULL,
      password_hash        text NOT NULL,
      must_change_password boolean NOT NULL DEFAULT true,
      last_login_at        timestamptz,
      created_at           timestamptz NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    CREATE TABLE portal.audit_log (
      id          bigserial PRIMARY KEY,
      admin_id    integer REFERENCES portal.admins(id) ON DELETE SET NULL,
      action      text NOT NULL,
      entity      text NOT NULL,
      entity_id   text,
      before_json jsonb,
      after_json  jsonb,
      created_at  timestamptz NOT NULL DEFAULT now()
    )
  `);

  pgm.sql(`
    ALTER TABLE portal.audit_log
      ADD CONSTRAINT audit_log_action_check
      CHECK (action IN ('create', 'update', 'delete', 'login', 'password_change'))
  `);

  pgm.sql(`
    ALTER TABLE portal.audit_log
      ADD CONSTRAINT audit_log_entity_check
      CHECK (entity IN ('service', 'category', 'admin'))
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS portal.audit_log');
  pgm.sql('DROP TABLE IF EXISTS portal.services');
  pgm.sql('DROP TABLE IF EXISTS portal.admins');
  pgm.sql('DROP TABLE IF EXISTS portal.categories');
};
