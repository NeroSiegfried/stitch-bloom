import { handleError, json, readRawBody } from '../../server/http.js';
import { recordRefund, recordVerifiedPayment, validWebhookSignature } from '../../server/paystack.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed.' });
    const rawBody = await readRawBody(req);
    if (!validWebhookSignature(rawBody, req.headers['x-paystack-signature'])) {
      return json(res, 401, { error: 'Invalid webhook signature.' });
    }
    const event = JSON.parse(rawBody.toString('utf8'));
    if (event.event === 'charge.success') {
      try {
        await recordVerifiedPayment(event.data);
      } catch (error) {
        // A stored review state is a handled business outcome. Infrastructure
        // failures must propagate so Paystack retries instead of losing money.
        if (error.code !== 'PAYMENT_REVIEW_REQUIRED') throw error;
        console.error(error);
      }
    }
    if (event.event?.startsWith('refund.')) {
      try {
        await recordRefund(event.data);
      } catch (error) {
        // Signed business-data failures are persisted for review (where an
        // order exists) and acknowledged to avoid a retry storm. Provider,
        // database, and other infrastructure failures still propagate.
        if (!['REFUND_REVIEW_REQUIRED', 'REFUND_ORDER_NOT_FOUND', 'REFUND_IDENTIFIER_MISSING'].includes(error.code)) {
          throw error;
        }
        console.error(error);
      }
    }
    return json(res, 200, { received: true });
  } catch (error) {
    return handleError(res, error);
  }
}
