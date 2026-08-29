import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL is required.');

// ADMIN_EMAIL is the authoritative owner list for whichever database this runs
// against. Every listed account is promoted and every admin that is not listed
// is demoted, so an owner transfer stays explicit. Production names a single
// address; the sandbox branch names as many as the shop needs.
const ownerEmails = [
  ...new Set(
    process.env.ADMIN_EMAIL.split(/[,\s]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  ),
];
if (!ownerEmails.length) throw new Error('ADMIN_EMAIL did not contain an address.');

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});

// Two databases now answer to this script, so name the target before touching it.
const host = new URL(process.env.DATABASE_URL).host;

try {
  await sql.begin(async (tx) => {
    const owners = await tx`SELECT id, email, role FROM users WHERE email IN ${tx(ownerEmails)}`;
    const missing = ownerEmails.filter((email) => !owners.some((owner) => owner.email === email));
    if (missing.length) {
      throw new Error(
        `No account matches ${missing.join(', ')}. Create each account through the storefront first.`,
      );
    }

    const ownerIds = owners.map((owner) => owner.id);
    const demoted = await tx`
      UPDATE users
      SET role = 'customer', updated_at = NOW()
      WHERE role = 'admin' AND id NOT IN ${tx(ownerIds)}
      RETURNING email
    `;
    const promoted = await tx`
      UPDATE users
      SET role = 'admin', updated_at = NOW()
      WHERE id IN ${tx(ownerIds)} AND role <> 'admin'
      RETURNING email
    `;

    console.log(`Database: ${host}`);
    console.log(`Owners: ${owners.map((owner) => owner.email).join(', ')}`);
    if (promoted.length) console.log(`Promoted: ${promoted.map((row) => row.email).join(', ')}`);
    if (demoted.length) console.log(`Owner access removed: ${demoted.map((row) => row.email).join(', ')}`);
    if (!promoted.length && !demoted.length) console.log('Already correct. No change was needed.');
  });
} finally {
  await sql.end();
}
