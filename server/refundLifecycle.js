function identifier(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

export function normalizeRefundStatus(value) {
  return identifier(value).toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
}

/**
 * Paystack's create/fetch responses and refund webhooks use different fields.
 * Keep every useful identifier so either shape can locate the same order.
 */
export function refundIdentifiers(refund = {}) {
  const transaction = refund.transaction;
  return {
    refundId: identifier(refund.id || refund.refund_id),
    refundReference: identifier(refund.refund_reference || refund.reference),
    transactionId: identifier(typeof transaction === 'object' ? transaction?.id : transaction),
    transactionReference: identifier(
      refund.transaction_reference || (typeof transaction === 'object' ? transaction?.reference : ''),
    ),
  };
}

export function refundOutcome(status, previousOrderStatus = 'paid') {
  const normalized = normalizeRefundStatus(status) || 'pending';
  if (normalized === 'processed') {
    return { status: normalized, paymentStatus: 'refunded', orderStatus: 'cancelled', terminal: true };
  }
  if (normalized === 'failed') {
    return {
      status: normalized,
      paymentStatus: 'paid',
      orderStatus: previousOrderStatus || 'paid',
      terminal: true,
    };
  }
  return {
    status: normalized,
    paymentStatus: 'refund_pending',
    orderStatus: 'refund_pending',
    terminal: false,
  };
}
