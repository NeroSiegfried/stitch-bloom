import { requireUser } from '../../server/auth.js';
import { db } from '../../server/db.js';
import { allowMethods, appUrl, handleError, HttpError, json, text } from '../../server/http.js';
import { recordVerifiedPayment, verifyTransaction } from '../../server/paystack.js';

export default async function handler(req, res) {
  try {
    allowMethods(req, ['GET']);
    const reference = text(req.query.reference, 160);
    if (!reference) throw new HttpError(400, 'A payment reference is required.');
    if (req.query.callback === '1') {
      const origin = appUrl(req);
      try {
        const payment = await verifyTransaction(reference);
        await recordVerifiedPayment(payment);
        return res.redirect(302, `${origin}/#/payment/callback?reference=${encodeURIComponent(reference)}&status=success`);
      } catch (error) {
        if (error.code === 'PAYMENT_PENDING') {
          return res.redirect(302, `${origin}/#/payment/callback?reference=${encodeURIComponent(reference)}&status=pending`);
        }
        if (error.code === 'PAYMENT_REVIEW_REQUIRED') {
          return res.redirect(302, `${origin}/#/payment/callback?reference=${encodeURIComponent(reference)}&status=review`);
        }
        return res.redirect(302, `${origin}/#/payment/callback?reference=${encodeURIComponent(reference)}&status=failed`);
      }
    }
    const user = await requireUser(req);
    const [owned] = await db()`
      SELECT orders.id FROM payment_attempts
      JOIN orders ON orders.id = payment_attempts.order_id
      WHERE payment_attempts.reference = ${reference} AND orders.user_id = ${user.id}
    `;
    if (!owned) throw new HttpError(404, 'Order not found.');
    try {
      const payment = await verifyTransaction(reference);
      const order = await recordVerifiedPayment(payment);
      return json(res, 200, { status: 'success', order });
    } catch (error) {
      if (error.code === 'PAYMENT_PENDING') {
        return json(res, 202, { status: 'pending', message: error.message });
      }
      throw error;
    }
  } catch (error) {
    return handleError(res, error);
  }
}
