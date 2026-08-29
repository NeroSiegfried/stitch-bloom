import { randomUUID } from 'node:crypto';
import { requireUser } from '../server/auth.js';
import { db } from '../server/db.js';
import { allowMethods, appUrl, assertSameOrigin, handleError, HttpError, json, readJson, text } from '../server/http.js';
import { initializeTransaction, paymentMode } from '../server/paystack.js';
import {
  canonicalNigeriaState,
  DELIVERY_FEES,
  deliveryFeeForState,
  deliveryZoneForState,
} from '../src/data/delivery.js';

export default async function handler(req, res) {
  try {
    allowMethods(req, ['POST']);
    assertSameOrigin(req);
    const user = await requireUser(req);
    const body = await readJson(req);
    const mode = paymentMode();
    const testDelivery = body.testDelivery === true;
    if (testDelivery && mode !== 'test') {
      throw new HttpError(400, 'Test delivery is available only on a test-payment deployment.');
    }
    const requestedItems = Array.isArray(body.items) ? body.items : [];
    if (!requestedItems.length || requestedItems.length > 50) throw new HttpError(400, 'Your bag is empty.');

    const shipping = {
      firstName: text(body.shipping?.firstName, 80),
      lastName: text(body.shipping?.lastName, 80),
      phone: text(body.shipping?.phone, 40),
      addressLine1: text(body.shipping?.addressLine1, 240),
      addressLine2: text(body.shipping?.addressLine2, 240),
      city: text(body.shipping?.city, 100),
      state: text(body.shipping?.state, 100),
      landmark: text(body.shipping?.landmark, 240),
    };
    if (!shipping.firstName || !shipping.lastName || !shipping.phone || !shipping.addressLine1 || !shipping.city || !shipping.state) {
      throw new HttpError(400, 'Complete the name, phone, and delivery address fields.');
    }
    const canonicalState = canonicalNigeriaState(shipping.state);
    const deliveryZone = testDelivery ? 'test' : deliveryZoneForState(canonicalState);
    if (!deliveryZone) throw new HttpError(400, 'Choose a valid Nigerian state or FCT.');
    shipping.state = canonicalState;

    const normalized = requestedItems.map((item) => ({
      id: text(item.productId, 100),
      quantity: Math.max(1, Math.min(10, Number.parseInt(item.quantity, 10) || 1)),
      variantLabel: text(item.variantLabel, 120) || null,
    }));
    const ids = [...new Set(normalized.map((item) => item.id))];
    const sql = db();
    const products = await sql`
      SELECT id, name, price, currency, images, variants, stock_quantity
      FROM products WHERE active = TRUE AND id IN ${sql(ids)}
    `;
    if (products.length !== ids.length) throw new HttpError(409, 'One or more products are no longer available. Refresh your bag and try again.');

    const lines = normalized.map((item) => {
      const product = products.find((candidate) => candidate.id === item.id);
      if (product.stock_quantity != null && product.stock_quantity < item.quantity) {
        throw new HttpError(409, `${product.name} does not have enough stock for that quantity.`);
      }
      const variants = typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants;
      if (variants.length > 0 && !item.variantLabel) {
        throw new HttpError(409, `Choose a colourway for ${product.name}.`);
      }
      if (item.variantLabel && !variants.some((variant) => variant.label === item.variantLabel)) {
        throw new HttpError(409, `The selected ${product.name} colourway is unavailable.`);
      }
      const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
      const variant = variants.find((candidate) => candidate.label === item.variantLabel);
      return {
        ...item,
        product,
        imageUrl: variant?.images?.[0] || images?.[0] || null,
        lineTotal: Number(product.price) * item.quantity,
      };
    });
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const deliveryFee = testDelivery ? DELIVERY_FEES.test : deliveryFeeForState(shipping.state);
    const total = subtotal + deliveryFee;
    const orderId = randomUUID();
    // Resolved before the order is written so a misconfigured deployment fails
    // before it can leave a draft order behind.
    const reference = `SB-${Date.now()}-${randomUUID().replaceAll('-', '').slice(0, 10)}`;
    const orderNumber = `SB-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO orders (
          id, order_number, user_id, email, customer_name, phone, address_line1,
          address_line2, city, state, landmark, delivery_zone, subtotal,
          delivery_fee, total, currency, payment_mode, paystack_reference
        ) VALUES (
          ${orderId}, ${orderNumber}, ${user.id}, ${user.email},
          ${`${shipping.firstName} ${shipping.lastName}`}, ${shipping.phone},
          ${shipping.addressLine1}, ${shipping.addressLine2 || null}, ${shipping.city},
          ${shipping.state}, ${shipping.landmark || null}, ${deliveryZone}, ${subtotal},
          ${deliveryFee}, ${total}, 'NGN', ${mode}, ${reference}
        )
      `;
      for (const line of lines) {
        await tx`
          INSERT INTO order_items (
            id, order_id, product_id, product_name, variant_label, image_url,
            unit_price, quantity, line_total
          ) VALUES (
            ${randomUUID()}, ${orderId}, ${line.product.id}, ${line.product.name},
            ${line.variantLabel}, ${line.imageUrl}, ${line.product.price},
            ${line.quantity}, ${line.lineTotal}
          )
        `;
      }
      await tx`
        INSERT INTO payment_attempts (id, order_id, reference, status, amount, currency, payment_mode)
        VALUES (${randomUUID()}, ${orderId}, ${reference}, 'pending', ${total}, 'NGN', ${mode})
      `;
      await tx`
        UPDATE users SET first_name = ${shipping.firstName}, last_name = ${shipping.lastName},
          phone = ${shipping.phone}, address_line1 = ${shipping.addressLine1},
          address_line2 = ${shipping.addressLine2 || null}, city = ${shipping.city},
          state = ${shipping.state}, landmark = ${shipping.landmark || null}, updated_at = NOW()
        WHERE id = ${user.id}
      `;
    });

    try {
      const origin = appUrl(req);
      const transaction = await initializeTransaction({
        email: user.email,
        amount: total * 100,
        currency: 'NGN',
        reference,
        callback_url: `${origin}/api/payments/verify?callback=1`,
        metadata: {
          order_id: orderId,
          payment_mode: mode,
          test_delivery: testDelivery,
          order_number: orderNumber,
          cancel_action: `${origin}/#/checkout?cancelled=1`,
        },
      });
      await sql`
        UPDATE orders SET paystack_access_code = ${transaction.access_code}, updated_at = NOW()
        WHERE id = ${orderId}
      `;
      await sql`
        UPDATE payment_attempts SET access_code = ${transaction.access_code}, updated_at = NOW()
        WHERE reference = ${reference}
      `;
      return json(res, 201, {
        order: { id: orderId, orderNumber, subtotal, deliveryFee, total, currency: 'NGN' },
        authorizationUrl: transaction.authorization_url,
      });
    } catch (error) {
      // No authorization URL reached the customer, so this is an initialization
      // failure rather than a placed order. Keep the bag and remove the draft.
      await sql`DELETE FROM orders WHERE id = ${orderId}`;
      throw error;
    }
  } catch (error) {
    return handleError(res, error);
  }
}
