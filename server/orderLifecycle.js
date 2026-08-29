export const ACTIVE_GATEWAY_STATUSES = new Set(['pending', 'ongoing', 'processing', 'queued']);
export const CLOSED_GATEWAY_STATUSES = new Set(['success', 'failed', 'abandoned', 'reversed']);
export const CLOSED_LOCAL_STATUSES = new Set(['cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded', 'closed']);

export function paymentStatusFromGateway(gatewayStatus) {
  if (gatewayStatus === 'success') return 'paid';
  if (['failed', 'abandoned'].includes(gatewayStatus)) return 'failed';
  if (ACTIVE_GATEWAY_STATUSES.has(gatewayStatus)) return 'pending';
  if (gatewayStatus === 'reversed') return 'refunded';
  return 'review';
}

export function localStatusAfterGatewayUpdate(gatewayStatus, currentLocalStatus = 'active') {
  if (gatewayStatus === 'success') return 'closed';
  if (CLOSED_GATEWAY_STATUSES.has(gatewayStatus)) {
    return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'closed';
  }
  if (ACTIVE_GATEWAY_STATUSES.has(gatewayStatus)) {
    return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'active';
  }
  return CLOSED_LOCAL_STATUSES.has(currentLocalStatus) ? currentLocalStatus : 'review_required';
}

export function successfulPaymentNeedsCancellationReview(orderStatus, attemptLocalStatus) {
  return ['cancelled', 'payment_expired'].includes(orderStatus)
    || ['cancelled_by_customer', 'cancelled_by_owner', 'expired', 'superseded'].includes(attemptLocalStatus);
}
