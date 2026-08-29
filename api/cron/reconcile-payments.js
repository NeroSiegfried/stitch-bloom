import { timingSafeEqual } from 'node:crypto';
import { handleError, json } from '../../server/http.js';
import { reconcilePendingPayments } from '../../server/paymentReconciliation.js';

function authorized(req) {
  const secret = String(process.env.CRON_SECRET || '');
  const supplied = String(req.headers.authorization || '');
  const expected = `Bearer ${secret}`;
  if (!secret || supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed.' });
    if (!authorized(req)) return json(res, 401, { error: 'Unauthorized.' });
    const result = await reconcilePendingPayments({ limit: 10, minAgeMinutes: 5 });
    return json(res, 200, { reconciled: true, ...result });
  } catch (error) {
    return handleError(res, error);
  }
}
