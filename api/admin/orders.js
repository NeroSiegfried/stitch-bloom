import { requireAdmin } from '../../server/auth.js';
import { db } from '../../server/db.js';
import {
  allowMethods,
  assertSameOrigin,
  handleError,
  HttpError,
  json,
  readJson,
  text,
} from '../../server/http.js';
import { createRefund, recordRefund } from '../../server/paystack.js';
import { reconcilePendingCommerce } from '../../server/paymentReconciliation.js';

const ORDER_STATUSES = ['paid', 'processing', 'dispatched', 'delivered', 'cancelled'];
const FILTER_STATUSES = new Set([
  ...ORDER_STATUSES,
  'payment_pending',
  'payment_expired',
  'paid_after_cancel_review',
  'shipped',
  'refund_pending',
]);
const PAYMENT_STATUSES = new Set(['pending', 'paid', 'failed', 'review', 'refund_pending', 'refunded']);
const SORTS = new Set(['newest', 'oldest', 'total_desc', 'total_asc']);

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET', 'PATCH', 'POST']);
    await requireAdmin(req);
    const sql = db();

    if (req.method === 'PATCH') {
      assertSameOrigin(req);
      const body = await readJson(req);
      const orderId = text(body.id, 80);
      const requestedStatus = text(body.status, 30);
      const status = requestedStatus === 'shipped' ? 'dispatched' : requestedStatus;
      if (!ORDER_STATUSES.includes(status)) throw new HttpError(400, 'Choose a valid order status.');

      const [order] = await sql`
        SELECT id, status, payment_status FROM orders WHERE id = ${orderId}
      `;
      if (!order) throw new HttpError(404, 'Order not found.');
      if (order.payment_status === 'refund_pending') throw new HttpError(409, 'This refund is still being processed.');
      if (order.payment_status === 'refunded') throw new HttpError(409, 'A refunded order remains cancelled.');
      if (status === 'cancelled' && order.payment_status === 'paid') {
        throw new HttpError(409, 'Start a refund to cancel a paid order. The order will be cancelled when Paystack processes it.');
      }
      if (status !== 'cancelled' && order.payment_status !== 'paid') {
        throw new HttpError(409, 'Only a paid order can enter fulfilment.');
      }

      const updated = await sql.begin(async (tx) => {
        const [changed] = await tx`
          UPDATE orders SET status = ${status},
            cancelled_at = CASE WHEN ${status} = 'cancelled' THEN NOW() ELSE cancelled_at END,
            updated_at = NOW()
          WHERE id = ${orderId}
          RETURNING id, status, payment_status
        `;
        if (status === 'cancelled') {
          await tx`
            UPDATE payment_attempts
            SET local_status = 'cancelled_by_owner', closed_at = NOW(), updated_at = NOW()
            WHERE order_id = ${orderId} AND local_status IN ('active', 'review_required')
          `;
        }
        return changed;
      });
      return json(res, 200, { order: updated });
    }

    if (req.method === 'POST') {
      assertSameOrigin(req);
      const body = await readJson(req);
      const action = text(body.action, 30);
      if (action === 'reconcile_pending') {
        const result = await reconcilePendingCommerce({ limit: 8, minAgeMinutes: 1 });
        return json(res, 200, result);
      }
      if (action !== 'refund') throw new HttpError(400, 'Choose a valid order action.');
      const orderId = text(body.id, 80);
      const [order] = await sql`
        SELECT id, order_number, total, currency, status, payment_status,
               paystack_reference, paystack_transaction_id, refund_id, refund_status
        FROM orders WHERE id = ${orderId}
      `;
      if (!order) throw new HttpError(404, 'Order not found.');
      if (order.payment_status !== 'paid') throw new HttpError(409, 'Only a paid order can be refunded.');
      if (order.refund_id && order.refund_status !== 'failed') throw new HttpError(409, 'A refund has already been started for this order.');
      const transaction = order.paystack_transaction_id || order.paystack_reference;
      if (!transaction) throw new HttpError(409, 'This order does not have a Paystack transaction to refund.');

      const refund = await createRefund({
        transaction,
        amount: Number(order.total) * 100,
        currency: order.currency,
        customer_note: `Refund for ${order.order_number}`,
        merchant_note: `Full refund initiated from The Stitch Bloom owner dashboard for ${order.order_number}`,
      });
      await sql`
        UPDATE orders SET refund_id = ${String(refund.id)}, refund_status = ${refund.status || 'pending'},
          refund_previous_status = ${order.status}, refund_payload = ${sql.json(refund)},
          payment_status = 'refund_pending', status = 'refund_pending', updated_at = NOW()
        WHERE id = ${order.id}
      `;
      const updated = await recordRefund(refund);
      return json(res, 200, { order: updated });
    }

    const query = text(req.query?.q, 120);
    const pattern = `%${query}%`;
    const requestedStatus = text(req.query?.status, 30);
    const status = FILTER_STATUSES.has(requestedStatus) ? requestedStatus : '';
    const requestedPaymentStatus = text(req.query?.paymentStatus, 30);
    const paymentStatus = PAYMENT_STATUSES.has(requestedPaymentStatus) ? requestedPaymentStatus : '';
    const dateFrom = /^\d{4}-\d{2}-\d{2}$/.test(text(req.query?.dateFrom, 10)) ? text(req.query.dateFrom, 10) : '';
    const dateTo = /^\d{4}-\d{2}-\d{2}$/.test(text(req.query?.dateTo, 10)) ? text(req.query.dateTo, 10) : '';
    const minTotal = integer(req.query?.minTotal, 0, 0, 1_000_000_000);
    const maxTotal = integer(req.query?.maxTotal, 0, 0, 1_000_000_000);
    const requestedSort = text(req.query?.sort, 20);
    const sort = SORTS.has(requestedSort) ? requestedSort : 'newest';
    const page = integer(req.query?.page, 1, 1, 1_000_000);
    const limit = integer(req.query?.limit, 30, 10, 100);
    const offset = (page - 1) * limit;

    const [countRow] = await sql`
      SELECT COUNT(*)::int AS total FROM orders
      WHERE (${query} = '' OR order_number ILIKE ${pattern} OR customer_name ILIKE ${pattern}
             OR email ILIKE ${pattern} OR phone ILIKE ${pattern} OR paystack_reference ILIKE ${pattern})
        AND (${status} = '' OR status = ${status})
        AND (${paymentStatus} = '' OR payment_status = ${paymentStatus})
        AND (${dateFrom} = '' OR created_at >= ${dateFrom || null}::date)
        AND (${dateTo} = '' OR created_at < (${dateTo || null}::date + INTERVAL '1 day'))
        AND (${minTotal} = 0 OR total >= ${minTotal})
        AND (${maxTotal} = 0 OR total <= ${maxTotal})
    `;
    const orders = await sql`
      SELECT id, order_number, user_id, email, customer_name, phone, address_line1,
             address_line2, city, state, landmark, delivery_zone, subtotal,
             delivery_fee, total, currency, status, payment_status, payment_mode,
             paystack_reference, paystack_transaction_id, payment_channel,
             payment_gateway_response, paid_at, refund_id, refund_status,
             refunded_at, cancelled_at, paid_after_cancel_at, created_at, updated_at
      FROM orders
      WHERE (${query} = '' OR order_number ILIKE ${pattern} OR customer_name ILIKE ${pattern}
             OR email ILIKE ${pattern} OR phone ILIKE ${pattern} OR paystack_reference ILIKE ${pattern})
        AND (${status} = '' OR status = ${status})
        AND (${paymentStatus} = '' OR payment_status = ${paymentStatus})
        AND (${dateFrom} = '' OR created_at >= ${dateFrom || null}::date)
        AND (${dateTo} = '' OR created_at < (${dateTo || null}::date + INTERVAL '1 day'))
        AND (${minTotal} = 0 OR total >= ${minTotal})
        AND (${maxTotal} = 0 OR total <= ${maxTotal})
      ORDER BY
        CASE WHEN ${sort} = 'oldest' THEN created_at END ASC,
        CASE WHEN ${sort} = 'total_desc' THEN total END DESC,
        CASE WHEN ${sort} = 'total_asc' THEN total END ASC,
        created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    const orderIds = orders.map((order) => order.id);
    const items = orders.length ? await sql`
      SELECT order_id, product_id, product_name, variant_label, image_url,
             unit_price, quantity, line_total
      FROM order_items WHERE order_id IN ${sql(orderIds)}
      ORDER BY product_name
    ` : [];
    const attempts = orders.length ? await sql`
      SELECT order_id, reference, status, local_status, transaction_id, channel,
             gateway_response, paid_at, closed_at, created_at, updated_at
      FROM payment_attempts WHERE order_id IN ${sql(orderIds)} ORDER BY created_at DESC
    ` : [];
    const [metrics] = await sql`
      SELECT
        COALESCE(SUM(total) FILTER (WHERE payment_status = 'paid'), 0)::bigint AS revenue,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
        COUNT(*) FILTER (WHERE status IN ('paid', 'processing', 'shipped', 'dispatched'))::int AS open,
        COUNT(*) FILTER (WHERE status = 'paid_after_cancel_review')::int AS review
      FROM orders WHERE payment_mode = 'live'
    `;
    const [testOrders] = await sql`
      SELECT COUNT(*)::int AS total FROM orders WHERE payment_mode = 'test'
    `;
    const total = countRow.total || 0;
    return json(res, 200, {
      orders: orders.map((order) => ({
        ...order,
        items: items.filter((item) => item.order_id === order.id),
        paymentAttempts: attempts.filter((attempt) => attempt.order_id === order.id),
      })),
      // Test orders are excluded from the figures above but still listed, so a
      // preview run never inflates revenue while staying visible to the owner.
      metrics: { ...metrics, testOrders: testOrders.total },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    return handleError(res, error);
  }
}
