import { db } from './db.js';
import { ACTIVE_GATEWAY_STATUSES } from './orderLifecycle.js';
import { paymentMode, recordVerifiedPayment, verifyTransaction } from './paystack.js';

const DEFAULT_MIN_AGE_MINUTES = 5;
const DEFAULT_EXPIRE_AFTER_HOURS = 24;

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function expireAttempt(sql, attempt, expireAfterHours) {
  const ageMs = Date.now() - new Date(attempt.created_at).getTime();
  if (ageMs < expireAfterHours * 60 * 60 * 1000) return false;

  return sql.begin(async (tx) => {
    const [expired] = await tx`
      UPDATE payment_attempts
      SET local_status = CASE WHEN local_status = 'active' THEN 'expired' ELSE local_status END,
          closed_at = COALESCE(closed_at, NOW()), updated_at = NOW()
      WHERE id = ${attempt.id}
        AND local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner')
        AND status IN ${tx([...ACTIVE_GATEWAY_STATUSES])}
      RETURNING order_id, reference
    `;
    if (!expired) return false;
    await tx`
      UPDATE orders
      SET payment_status = 'failed',
          status = CASE WHEN status IN ('pending', 'payment_pending') THEN 'payment_expired' ELSE status END,
          updated_at = NOW()
      WHERE id = ${expired.order_id}
        AND paystack_reference = ${expired.reference}
        AND payment_status NOT IN ('paid', 'refund_pending', 'refunded')
    `;
    return true;
  });
}

/**
 * Rechecks a small batch of stale active attempts without making an order-list
 * request depend on Paystack being available. A late success remains safe:
 * recordVerifiedPayment moves a locally closed order into owner review.
 */
export async function reconcilePendingPayments({
  userId = '',
  limit = 8,
  minAgeMinutes = DEFAULT_MIN_AGE_MINUTES,
  expireAfterHours = positiveNumber(process.env.PAYMENT_ATTEMPT_TTL_HOURS, DEFAULT_EXPIRE_AFTER_HOURS),
} = {}) {
  const sql = db();
  const mode = paymentMode();
  const boundedLimit = Math.max(1, Math.min(20, Number.parseInt(limit, 10) || 8));
  const minimumAge = positiveNumber(minAgeMinutes, DEFAULT_MIN_AGE_MINUTES);
  const attempts = await sql`
    SELECT attempt.id, attempt.order_id, attempt.reference, attempt.created_at
    FROM payment_attempts AS attempt
    JOIN orders ON orders.id = attempt.order_id
    WHERE attempt.payment_mode = ${mode}
      AND attempt.local_status IN ('active', 'cancelled_by_customer', 'cancelled_by_owner')
      AND attempt.status IN ${sql([...ACTIVE_GATEWAY_STATUSES])}
      AND orders.payment_status IN ('pending', 'review')
      AND attempt.updated_at < NOW() - (${minimumAge} * INTERVAL '1 minute')
      AND (${userId} = '' OR orders.user_id = ${userId})
    ORDER BY attempt.updated_at ASC
    LIMIT ${boundedLimit}
  `;

  const results = await Promise.all(attempts.map(async (attempt) => {
    try {
      const payment = await verifyTransaction(attempt.reference);
      await recordVerifiedPayment(payment);
    } catch (error) {
      // recordVerifiedPayment uses 409 for a verified but incomplete payment.
      // Provider/network failures stay active so a later run can retry safely.
      if (error.status !== 409) {
        console.error(`Payment reconciliation failed for ${attempt.reference}: ${error.message}`);
        await sql`
          UPDATE payment_attempts SET updated_at = NOW()
          WHERE id = ${attempt.id}
        `;
        return { checked: true, expired: false, error: true };
      }
    }
    const expired = await expireAttempt(sql, attempt, expireAfterHours);
    return { checked: true, expired, error: false };
  }));

  return results.reduce((summary, result) => ({
    checked: summary.checked + 1,
    expired: summary.expired + Number(result.expired),
    errors: summary.errors + Number(result.error),
  }), { checked: 0, expired: 0, errors: 0 });
}
