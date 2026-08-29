import { mkdirSync, writeFileSync } from 'node:fs';
import postgres from 'postgres';

// Clears order history for whichever database DATABASE_URL points at, so a
// branch can start from scratch without disturbing the catalogue, accounts or
// site settings. order_items and payment_attempts cascade from orders, so the
// single DELETE below clears all three. The rows are written to backups/ first:
// the dump is the only copy afterwards, short of a Neon point-in-time restore.
//
// Dry run by default. Pass --yes to actually delete.

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');

const confirmed = process.argv.includes('--yes');
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: process.env.DATABASE_SSL === 'disable' ? false : 'require',
});
const host = new URL(process.env.DATABASE_URL).host;

try {
  const [orders, orderItems, paymentAttempts] = await Promise.all([
    sql`SELECT * FROM orders ORDER BY created_at`,
    sql`SELECT * FROM order_items`,
    sql`SELECT * FROM payment_attempts ORDER BY created_at`,
  ]);

  console.log(`Database: ${host}`);
  console.log(`  orders            ${orders.length}`);
  console.log(`  order_items       ${orderItems.length}`);
  console.log(`  payment_attempts  ${paymentAttempts.length}`);

  if (!orders.length && !orderItems.length && !paymentAttempts.length) {
    console.log('Order history is already empty. Nothing to do.');
  } else if (!confirmed) {
    console.log('\nDry run. Re-run with --yes to back up and delete these rows.');
  } else {
    mkdirSync('backups', { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const endpoint = host.split('.')[0];
    const backupPath = `backups/order-history-${endpoint}-${stamp}.json`;
    writeFileSync(
      backupPath,
      `${JSON.stringify({ database: host, exportedAt: new Date().toISOString(), orders, orderItems, paymentAttempts }, null, 2)}\n`,
    );
    console.log(`\nBacked up to ${backupPath}`);

    const deleted = await sql`DELETE FROM orders RETURNING id`;
    const [{ n: itemsLeft }] = await sql`SELECT COUNT(*)::int AS n FROM order_items`;
    const [{ n: attemptsLeft }] = await sql`SELECT COUNT(*)::int AS n FROM payment_attempts`;
    console.log(`Deleted ${deleted.length} orders. order_items left ${itemsLeft}, payment_attempts left ${attemptsLeft}.`);
  }
} finally {
  await sql.end();
}
