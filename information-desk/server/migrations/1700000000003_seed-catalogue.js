/* eslint-disable camelcase */

/**
 * Seed catalogue: six categories and a realistic set of placeholder services.
 *
 * These are safe to edit or delete through the admin UI once the portal is
 * live — they exist so a fresh install is not an empty page. The URLs are
 * deliberately example hostnames; swap them for your real systems.
 */

exports.shorthands = undefined;

const CATEGORIES = [
  { key: 'core-systems', label: 'Core Systems', icon: 'pi pi-server', sort_order: 10 },
  { key: 'finance', label: 'Finance', icon: 'pi pi-wallet', sort_order: 20 },
  { key: 'hr-admin', label: 'HR & Admin', icon: 'pi pi-users', sort_order: 30 },
  { key: 'it-support', label: 'IT Support', icon: 'pi pi-wrench', sort_order: 40 },
  { key: 'reporting-bi', label: 'Reporting & BI', icon: 'pi pi-chart-bar', sort_order: 50 },
  { key: 'external-portals', label: 'External Portals', icon: 'pi pi-external-link', sort_order: 60 },
];

const SERVICES = [
  ['core-systems', 'ERP', 'https://erp.example.org', 'Finance, procurement and inventory master system.', 'pi pi-building', 10],
  ['core-systems', 'CRM', 'https://crm.example.org', 'Customer accounts, opportunities and support cases.', 'pi pi-id-card', 20],
  ['core-systems', 'Document Library', 'https://docs.example.org', 'Controlled documents, policies and templates.', 'pi pi-folder-open', 30],
  ['core-systems', 'Staff Intranet', 'https://intranet.example.org', 'Company news, org chart and internal announcements.', 'pi pi-home', 40],

  ['finance', 'Expense Claims', 'https://expenses.example.org', 'Submit receipts and track reimbursement status.', 'pi pi-receipt', 10],
  ['finance', 'Invoice Approval', 'https://ap.example.org/approvals', 'Review and approve supplier invoices awaiting sign-off.', 'pi pi-check-square', 20],
  ['finance', 'Purchase Requisitions', 'https://procure.example.org', 'Raise a purchase request and follow its approval chain.', 'pi pi-shopping-cart', 30],

  ['hr-admin', 'HR Self-Service', 'https://hr.example.org', 'Personal details, contracts and payslips.', 'pi pi-user-edit', 10],
  ['hr-admin', 'Leave & Absence', 'https://hr.example.org/leave', 'Book annual leave and view your remaining balance.', 'pi pi-calendar', 20],
  ['hr-admin', 'Learning Hub', 'https://learning.example.org', 'Mandatory training, courses and certifications.', 'pi pi-book', 30],
  ['hr-admin', 'Room & Desk Booking', 'https://workplace.example.org', 'Reserve meeting rooms, desks and parking spaces.', 'pi pi-map-marker', 40],

  ['it-support', 'Service Desk', 'https://servicedesk.example.org', 'Raise an IT ticket or check an existing one.', 'pi pi-ticket', 10],
  ['it-support', 'Password Self-Service', 'https://identity.example.org/reset', 'Reset or unlock your account without calling the desk.', 'pi pi-key', 20],
  ['it-support', 'Software Catalogue', 'https://software.example.org', 'Request licensed software and hardware peripherals.', 'pi pi-download', 30],

  ['reporting-bi', 'Analytics Workspace', 'https://bi.example.org', 'Operational dashboards and scheduled reports.', 'pi pi-chart-line', 10],
  ['reporting-bi', 'Data Catalogue', 'https://catalog.example.org', 'Find datasets, owners and definitions.', 'pi pi-database', 20],

  ['external-portals', 'Supplier Portal', 'https://suppliers.example.com', 'Vendor onboarding, contracts and remittance advice.', 'pi pi-truck', 10],
  ['external-portals', 'Benefits Provider', 'https://benefits.example.com', 'Pension, healthcare and salary-sacrifice schemes.', 'pi pi-heart', 20],
];

/** Single-quote escaping for the static literals defined above. */
const lit = (value) => (value === null || value === undefined ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`);

exports.up = (pgm) => {
  const categoryValues = CATEGORIES.map(
    (c) => `(${lit(c.key)}, ${lit(c.label)}, ${lit(c.icon)}, ${c.sort_order})`,
  ).join(',\n      ');

  pgm.sql(`
    INSERT INTO portal.categories (key, label, icon, sort_order)
    VALUES
      ${categoryValues}
    ON CONFLICT (key) DO NOTHING
  `);

  const serviceValues = SERVICES.map(
    ([key, name, url, description, icon, sortOrder]) =>
      `(${lit(key)}, ${lit(name)}, ${lit(url)}, ${lit(description)}, ${lit(icon)}, ${sortOrder})`,
  ).join(',\n        ');

  pgm.sql(`
    INSERT INTO portal.services (name, url, category_id, description, icon, sort_order)
    SELECT s.name, s.url, c.id, s.description, s.icon, s.sort_order
    FROM (
      VALUES
        ${serviceValues}
    ) AS s(category_key, name, url, description, icon, sort_order)
    JOIN portal.categories c ON c.key = s.category_key
  `);
};

exports.down = (pgm) => {
  const keys = CATEGORIES.map((c) => lit(c.key)).join(', ');
  pgm.sql(`
    DELETE FROM portal.services
    WHERE category_id IN (SELECT id FROM portal.categories WHERE key IN (${keys}))
  `);
  pgm.sql(`DELETE FROM portal.categories WHERE key IN (${keys})`);
};
