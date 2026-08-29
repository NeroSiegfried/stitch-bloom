import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (!process.env.ADMIN_EMAIL) throw new Error('ADMIN_EMAIL is required.');

const ownerEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});

try {
  await sql.begin(async (tx) => {
    const [owner] = await tx`SELECT id FROM users WHERE email = ${ownerEmail}`;
    if (!owner) {
      throw new Error('No account matches ADMIN_EMAIL. Create that account through the storefront first.');
    }

    await tx`
      UPDATE users
      SET role = 'customer', updated_at = NOW()
      WHERE role = 'admin' AND id <> ${owner.id}
    `;
    await tx`
      UPDATE users
      SET role = 'admin', updated_at = NOW()
      WHERE id = ${owner.id}
    `;
  });
  console.log('Owner access assigned to the account matching ADMIN_EMAIL. Previous owner access was removed.');
} finally {
  await sql.end();
}
