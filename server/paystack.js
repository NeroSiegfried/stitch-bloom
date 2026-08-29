import crypto from 'node:crypto';
import { db } from './db.js';
import { HttpError } from './http.js';
import {
  CLOSED_LOCAL_STATUSES,
  localStatusAfterGatewayUpdate,
  paymentStatusFromGateway,
  successfulPaymentNeedsCancellationReview,
} from './orderLifecycle.js';

// Vercel environments that must never be able to move real money. A preview is
// throwaway and shares the production database, so a live key reaching one is a
// configuration mistake worth failing loudly on rather than charging a card.
const TEST_ONLY_ENVIRONMENTS = new Set(['preview', 'development']);

/**
 * A Paystack secret key is `sk_live_`/`sk_test_` followed by 40 hex characters.
 * This is only used to annotate an auth failure — never to block a request, so
 * a key in some future shape still works rather than being rejected here.
 */
const SECRET_KEY_SHAPE = /^sk_(test|live)_[0-9a-f]{40}$/;

/** Describes the key in use without revealing it: prefix and length only. */
export function describeSecretKey() {
  const secret = String(process.env.PAYSTACK_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!secret) return 'no key set';
  const prefix = secret.slice(0, secret.indexOf('_', 3) + 1) || secret.slice(0, 8);
  const body = secret.slice(prefix.length);
  const shape = SECRET_KEY_SHAPE.test(secret)
    ? 'expected shape'
    : `unexpected shape — got ${body.length} characters after "${prefix}", expected 40 hexadecimal`;
  return `${prefix}\u2026 (${shape})`;
}

function paystackSecret() {
  // Surrounding quotes are a common paste artefact when setting the value in a
  // dashboard field, and would otherwise be sent as part of the key.
  const secret = String(process.env.PAYSTACK_SECRET_KEY || '').trim().replace(/^["']|["']$/g, '');
  if (!secret) {
    throw new HttpError(503, 'Paystack has not been configured yet.');
  }
  if (secret.startsWith('sk_live_') && TEST_ONLY_ENVIRONMENTS.has(process.env.VERCEL_ENV)) {
    throw new HttpError(503, 'This deployment may only use Paystack test keys. Set a sk_test_ key for this environment.');
  }
  return secret;
}

// 'test' or 'live', taken from the key the deployment is actually holding, so
// the mode can never drift from the account the payment is charged against.
export function paymentMode() {
  return paystackSecret().startsWith('sk_live_') ? 'live' : 'test';
}

async function paystackRequest(path, options = {}) {
  let response;
  try {
    response = await fetch(`https://api.paystack.co${path}`, {
      ...options,
      signal: options.signal || AbortSignal.timeout(6_000),
      headers: {
        Authorization: `Bearer ${paystackSecret()}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw new HttpError(502, timedOut ? 'Paystack did not respond in time.' : 'Paystack could not be reached.', {
      expose: true,
      code: timedOut ? 'PAYSTACK_TIMEOUT' : 'PAYSTACK_UNAVAILABLE',
    });
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.status) {
    const detail = payload?.message || 'Paystack could not process the request.';
    // An authentication failure is almost always a configuration mistake, so
    // say which key the deployment is actually holding.
    const hint = response.status === 401 || /invalid key/i.test(detail)
      ? ` — this deployment is using ${describeSecretKey()}`
      : '';
    console.error(`Paystack ${options.method || 'GET'} ${path} failed: HTTP ${response.status} — ${detail}${hint}`);
    throw new HttpError(502, `Paystack: ${detail}${hint}`, { expose: true, code: 'PAYSTACK_UPSTREAM_ERROR' });
  }
  return payload.data;
}

export function initializeTransaction(fields) {
  return paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export function verifyTransaction(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
}

export function createRefund(fields) {
  return paystackRequest('/refund', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
}

export function validWebhookSignature(rawBody, signature) {
  if (!signature) return false;
  const expected = crypto.createHmac('sha512', paystackSecret()).update(rawBody).digest('hex');
  const supplied = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return supplied.length === expectedBuffer.length && crypto.timingSafeEqual(supplied, expectedBuffer);
}

export async function recordVerifiedPayment(payment) {
  const sql = db();
  const [order] = await sql`
    SELECT orders.id, orders.total, orders.currency, orders.payment_status,
           orders.paystack_reference, orders.payment_mode, payment_attempts.id AS attempt_id,
           payment_attempts.local_status AS attempt_local_status
    FROM payment_attempts
    JOIN orders ON orders.id = payment_attempts.order_id
    WHERE payment_attempts.reference = ${payment.reference}
  `;
  if (!order) throw new HttpError(404, 'No order matches this payment reference.');

  const expectedAmount = Number(order.total) * 100;
  const amountMatches = Number(payment.amount) === expectedAmount && payment.currency === order.currency;

  if (!amountMatches) {
    const localStatus = CLOSED_LOCAL_STATUSES.has(order.attempt_local_status)
      ? order.attempt_local_status
      : 'review_required';
    await sql`
      UPDATE payment_attempts SET status = 'review', local_status = ${localStatus},
        payload = ${sql.json(payment)}, updated_at = NOW()
      WHERE id = ${order.attempt_id}
    `;
    await sql`
      UPDATE orders SET payment_status = 'review', paystack_payload = ${sql.json(payment)}, updated_at = NOW()
      WHERE id = ${order.id}
    `;
    throw new HttpError(409, 'The payment details did not match the order total. The order needs review.', {
      code: 'PAYMENT_REVIEW_REQUIRED',
    });
  }

  if (payment.status !== 'success') {
    const attemptStatus = payment.status || 'failed';
    const paymentStatus = paymentStatusFromGateway(attemptStatus);
    const localStatus = localStatusAfterGatewayUpdate(attemptStatus, order.attempt_local_status);
    const closesAttempt = localStatus === 'closed';
    const preserveLocallyClosedPending = CLOSED_LOCAL_STATUSES.has(localStatus) && paymentStatus === 'pending';
    await sql.begin(async (tx) => {
      await tx`
        UPDATE payment_attempts SET status = ${attemptStatus}, transaction_id = ${payment.id ? String(payment.id) : null},
          channel = ${payment.channel || null}, gateway_response = ${payment.gateway_response || null},
          local_status = ${localStatus},
          closed_at = CASE WHEN ${closesAttempt} THEN COALESCE(closed_at, NOW()) ELSE closed_at END,
          payload = ${tx.json(payment)}, updated_at = NOW()
        WHERE id = ${order.attempt_id}
      `;
      await tx`
        UPDATE orders SET payment_status = CASE
            WHEN ${preserveLocallyClosedPending} THEN payment_status
            ELSE ${paymentStatus}
          END,
          status = CASE WHEN ${paymentStatus} = 'refunded' THEN 'cancelled' ELSE status END,
          paystack_payload = ${tx.json(payment)}, updated_at = NOW()
        WHERE id = ${order.id} AND payment_status <> 'paid'
          AND paystack_reference = ${payment.reference}
      `;
    });
    throw new HttpError(409, paymentStatus === 'pending' ? 'The payment is still pending.' : 'The payment was not completed.', {
      code: paymentStatus === 'pending' ? 'PAYMENT_PENDING' : 'PAYMENT_NOT_COMPLETED',
    });
  }

  return sql.begin(async (tx) => {
    const [lockedOrder] = await tx`
      SELECT id, order_number, status, payment_status, paystack_reference, total, currency, paid_at
      FROM orders WHERE id = ${order.id} FOR UPDATE
    `;
    const wasAlreadyPaid = lockedOrder.payment_status === 'paid';
    const needsCancellationReview = successfulPaymentNeedsCancellationReview(
      lockedOrder.status,
      order.attempt_local_status,
    );
    await tx`
      UPDATE payment_attempts SET status = 'success', transaction_id = ${String(payment.id)},
        channel = ${payment.channel || null}, gateway_response = ${payment.gateway_response || null},
        paid_at = ${payment.paid_at || payment.paidAt || new Date().toISOString()},
        local_status = 'closed', closed_at = NOW(),
        payload = ${tx.json(payment)}, updated_at = NOW()
      WHERE id = ${order.attempt_id}
    `;
    if (wasAlreadyPaid && lockedOrder.paystack_reference !== payment.reference) {
      // Preserve the original settled transaction while retaining this extra
      // successful attempt for the owner to investigate and refund if needed.
      return lockedOrder;
    }
    const [updated] = await tx`
      UPDATE orders SET
        status = CASE
          WHEN ${needsCancellationReview} THEN 'paid_after_cancel_review'
          WHEN status IN ('pending', 'payment_pending', 'payment_expired') THEN 'paid'
          ELSE status
        END,
        payment_status = 'paid',
        paystack_reference = ${payment.reference},
        paystack_transaction_id = ${String(payment.id)},
        payment_channel = ${payment.channel || null},
        payment_gateway_response = ${payment.gateway_response || null},
        paid_at = ${payment.paid_at || payment.paidAt || new Date().toISOString()},
        paid_after_cancel_at = CASE WHEN ${needsCancellationReview} THEN NOW() ELSE paid_after_cancel_at END,
        paystack_payload = ${tx.json(payment)},
        updated_at = NOW()
      WHERE id = ${order.id}
      RETURNING id, order_number, status, payment_status, total, currency, paid_at
    `;
    // A test payment writes its order for inspection but must not touch the
    // stock the live shop is selling from.
    if (!wasAlreadyPaid && order.payment_mode !== 'test') {
      await tx`
        UPDATE products AS product
        SET stock_quantity = GREATEST(0, product.stock_quantity - item.quantity), updated_at = NOW()
        FROM order_items AS item
        WHERE item.order_id = ${order.id} AND item.product_id = product.id
          AND product.stock_quantity IS NOT NULL
      `;
    }
    return updated;
  });
}

export async function recordRefund(refund) {
  const sql = db();
  const refundId = String(refund.id || '');
  const transactionId = typeof refund.transaction === 'object'
    ? String(refund.transaction?.id || '')
    : String(refund.transaction || '');
  const [order] = await sql`
    SELECT id, payment_status, payment_mode FROM orders
    WHERE refund_id = ${refundId}
       OR (${transactionId} <> '' AND paystack_transaction_id = ${transactionId})
    LIMIT 1
  `;
  if (!order) throw new HttpError(404, 'No order matches this refund.');

  const status = refund.status || 'pending';
  return sql.begin(async (tx) => {
    const [locked] = await tx`
      SELECT payment_status, refund_previous_status FROM orders WHERE id = ${order.id} FOR UPDATE
    `;
    const wasRefunded = locked.payment_status === 'refunded';
    const isProcessed = status === 'processed';
    const isFailed = status === 'failed';
    const [updated] = await tx`
      UPDATE orders SET refund_id = ${refundId || null}, refund_status = ${status},
        refund_payload = ${tx.json(refund)},
        payment_status = ${isProcessed ? 'refunded' : isFailed ? 'paid' : 'refund_pending'},
        status = ${isProcessed ? 'cancelled' : isFailed ? (locked.refund_previous_status || 'paid') : 'refund_pending'},
        refunded_at = ${isProcessed ? (refund.refunded_at || new Date().toISOString()) : null},
        cancelled_at = ${isProcessed ? new Date().toISOString() : null}, updated_at = NOW()
      WHERE id = ${order.id}
      RETURNING id, order_number, status, payment_status, refund_status
    `;
    if (isProcessed && !wasRefunded && order.payment_mode !== 'test') {
      await tx`
        UPDATE products AS product
        SET stock_quantity = product.stock_quantity + item.quantity, updated_at = NOW()
        FROM order_items AS item
        WHERE item.order_id = ${order.id} AND item.product_id = product.id
          AND product.stock_quantity IS NOT NULL
      `;
    }
    return updated;
  });
}
