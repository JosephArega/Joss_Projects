/* eslint-disable camelcase */

/**
 * Creates the dedicated `portal` schema and the extensions the app relies on.
 *
 * Extensions are installed into `public` on purpose: `citext` and the trigram
 * operator classes are types/operators that must be resolvable from the
 * search_path of every connection, and `public` is always on it.
 */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql('CREATE SCHEMA IF NOT EXISTS portal');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public');
};

exports.down = () => {
  // Deliberately a no-op.
  //
  //  * The extensions are shared server-wide — other databases or schemas may
  //    depend on them, so this app does not remove them.
  //  * The `portal` schema itself must survive: node-pg-migrate keeps its own
  //    `pgmigrations` bookkeeping table inside it, and dropping the schema
  //    here would delete the very table this migration is being recorded in.
  //
  // Every migration above this one drops the objects it created, so a full
  // unwind leaves an empty `portal` schema. Remove it by hand if you really
  // want the database back to bare metal:
  //
  //     DROP SCHEMA portal CASCADE;
};
