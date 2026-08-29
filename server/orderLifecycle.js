export const ACTIVE_GATEWAY_STATUSES = new Set(['pending', 'ongoing', 'processing', 'queued']);
export const REFUND_PENDING_GATEWAY_STATUSES = new Set(['reversal-pending', 'reversal_pending']);
export const CLOSED_GATEWAY_STATUSES = new Set([
  'success',
  'failed',
  'abandoned',
  'reversed',
  ...REFUND_PENDING_GATEWAY_STATUSES,
]);
export const CLOSED_LOCAL_STATUSES = new Set(['cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded', 'closed']);

export function paymentStatusFromGateway(gatewayStatus) {
  const status = String(gatewayStatus || '').toLowerCase();
  if (status === 'success') return 'paid';
  if (['failed', 'abandoned'].includes(status)) return 'failed';
  if (ACTIVE_GATEWAY_STATUSES.has(status)) return 'pending';
  if (REFUND_PENDING_GATEWAY_STATUSES.has(status)) return 'refund_pending';
  if (status === 'reversed') return 'refunded';
  return 'review';
}

export function localStatusAfterGatewayUpdate(gatewayStatus, currentLocalStatus = 'active') {
  const status = String(gatewayStatus || '').toLowerCase();
  if (status === 'success') return 'closed';
  if (CLOSED_GATEWAY_STATUSES.has(status)) {
    return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'closed';
  }
  if (ACTIVE_GATEWAY_STATUSES.has(status)) {
    return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'active';
  }
  return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'review_required';
}

export function successfulPaymentNeedsCancellationReview(orderStatus, attemptLocalStatus) {
  return ['cancelled', 'payment_expired'].includes(orderStatus)
    || ['cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded'].includes(attemptLocalStatus);
}
