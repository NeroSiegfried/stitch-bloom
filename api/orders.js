import { randomUUID } from 'node:crypto';
import { requireUser } from '../server/auth.js';
import { db } from '../server/db.js';
import {
  allowMethods,
  appUrl,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJson,
  text,
} from '../server/http.js';
import { reconcilePendingPayments } from '../server/paymentReconciliation.js';
import { initializeTransaction, paymentMode, recordVerifiedPayment, verifyTransaction } from '../server/paystack.js';

async function getOwnedOrder(sql, userId, orderId) {
  const [order] = await sql`
    SELECT id, order_number, user_id, email, total, currency, status, payment_status,
           payment_mode, paystack_reference, paystack_transaction_id
    FROM orders
    WHERE id = ${orderId} AND user_id = ${userId}
  `;
  if (!order) throw new HttpError(404, 'Order not found.');
  return order;
}

async function refreshPendingPayment(order) {
  if (!order.paystack_reference || !['pending', 'review'].includes(order.payment_status)) return;
  // Preview and production share a database but use different Paystack
  // accounts. Never try to verify a reference with the wrong account key.
  if (order.payment_mode !== paymentMode()) return;
  try {
    const payment = await verifyTransaction(order.paystack_reference);
    await recordVerifiedPayment(payment);
  } catch (error) {
    // A 409 is the expected result when Paystack confirms that the attempt is
    // incomplete. Network and configuration failures must block a risky action.
    if (error.status !== 409) throw error;
  }
}

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET', 'POST']);
    const user = await requireUser(req);
    const sql = db();

    if (req.method === 'POST') {
      assertSameOrigin(req);
      const body = await readJson(req);
      const action = text(body.action, 30);
      if (action === 'reconcile_pending') {
        const result = await reconcilePendingPayments({ userId: user.id, limit: 5, minAgeMinutes: 1 });
        return json(res, 200, result);
      }
      const orderId = text(body.id, 80);
      if (!orderId) throw new HttpError(400, 'Choose an order.');

      let order = await getOwnedOrder(sql, user.id, orderId);
      if (['paid', 'refund_pending', 'refunded'].includes(order.payment_status)) {
        throw new HttpError(409, 'A paid order cannot be retried or cancelled here. Please contact The Stitch Bloom.');
      }
      if (['cancelled', 'delivered'].includes(order.status)) {
        throw new HttpError(409, 'This order can no longer be changed.');
      }

      await refreshPendingPayment(order);
      order = await getOwnedOrder(sql, user.id, orderId);
      if (order.payment_status === 'paid') {
        throw new HttpError(409, 'This payment has completed. Refresh your order history to see the update.');
      }

      if (action === 'cancel') {
        const cancelled = await sql.begin(async (tx) => {
          const [updated] = await tx`
            UPDATE orders
            SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
            WHERE id = ${order.id} AND user_id = ${user.id}
              AND payment_status NOT IN ('paid', 'refund_pending', 'refunded')
              AND status <> 'cancelled'
            RETURNING id, status, payment_status
          `;
          if (!updated) return null;
          await tx`
            UPDATE payment_attempts
            SET local_status = 'cancelled_by_customer', closed_at = NOW(), updated_at = NOW()
            WHERE order_id = ${order.id} AND local_status IN ('active', 'review_required')
          `;
          return updated;
        });
        if (!cancelled) throw new HttpError(409, 'This order can no longer be cancelled.');
        return json(res, 200, { order: cancelled });
      }

      if (action !== 'retry') throw new HttpError(400, 'Choose a valid order action.');

      const reference = `SB-${Date.now()}-${randomUUID().replaceAll('-', '').slice(0, 10)}`;
      const rootUrl = appUrl(req);
      const mode = paymentMode();
      const transaction = await initializeTransaction({
        email: order.email,
        amount: Number(order.total) * 100,
        currency: order.currency,
        reference,
        callback_url: `${rootUrl}/api/payments/verify?callback=1`,
        metadata: {
          order_id: order.id,
          order_number: order.order_number,
          payment_mode: mode,
          retry: true,
          cancel_action: `${rootUrl}/#/account`,
        },
      });

      await sql.begin(async (tx) => {
        const [updated] = await tx`
          UPDATE orders
          SET status = 'payment_pending', payment_status = 'pending',
              payment_mode = ${mode},
              paystack_reference = ${reference}, paystack_access_code = ${transaction.access_code},
              updated_at = NOW()
          WHERE id = ${order.id} AND user_id = ${user.id}
            AND payment_status NOT IN ('paid', 'refund_pending', 'refunded')
            AND status <> 'cancelled'
          RETURNING id
        `;
        if (!updated) throw new HttpError(409, 'This order can no longer be retried.');
        await tx`
          UPDATE payment_attempts
          SET local_status = 'superseded', closed_at = NOW(), updated_at = NOW()
          WHERE order_id = ${order.id} AND local_status IN ('active', 'review_required')
        `;
        await tx`
          INSERT INTO payment_attempts (
            id, order_id, reference, access_code, status, amount, currency, payment_mode
          ) VALUES (
            ${randomUUID()}, ${order.id}, ${reference}, ${transaction.access_code}, 'pending',
            ${order.total}, ${order.currency}, ${mode}
          )
        `;
      });

      return json(res, 200, { authorizationUrl: transaction.authorization_url });
    }

    const orders = await sql`
      SELECT id, order_number, subtotal, delivery_fee, total, currency, status,
             payment_status, payment_channel, payment_gateway_response, paid_at,
             created_at, delivery_zone, customer_name, phone, address_line1,
             address_line2, city, state, landmark, paystack_reference,
             refund_status, refunded_at, cancelled_at, paid_after_cancel_at
      FROM orders WHERE user_id = ${user.id} ORDER BY created_at DESC
    `;
    const orderIds = orders.map((order) => order.id);
    const items = orders.length ? await sql`
      SELECT order_id, product_name, variant_label, image_url, unit_price, quantity, line_total
      FROM order_items WHERE order_id IN ${sql(orderIds)}
      ORDER BY product_name
    ` : [];
    const attempts = orders.length ? await sql`
      SELECT order_id, reference, status, local_status, channel, gateway_response,
             paid_at, closed_at, created_at, updated_at
      FROM payment_attempts WHERE order_id IN ${sql(orderIds)}
      ORDER BY created_at DESC
    ` : [];
    return json(res, 200, {
      orders: orders.map((order) => ({
        ...order,
        items: items.filter((item) => item.order_id === order.id),
        paymentAttempts: attempts.filter((attempt) => attempt.order_id === order.id),
      })),
    });
  } catch (error) {
    return handleError(res, error);
  }
}
