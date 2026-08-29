import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localStatusAfterGatewayUpdate,
  paymentStatusFromGateway,
  successfulPaymentNeedsCancellationReview,
} from './orderLifecycle.js';

test('normalizes Paystack attempt states without losing the raw state', () => {
  assert.equal(paymentStatusFromGateway('ongoing'), 'pending');
  assert.equal(paymentStatusFromGateway('abandoned'), 'failed');
  assert.equal(paymentStatusFromGateway('reversed'), 'refunded');
  assert.equal(paymentStatusFromGateway('mystery-state'), 'review');
});

test('a pending gateway update cannot reopen a locally closed attempt', () => {
  assert.equal(localStatusAfterGatewayUpdate('ongoing', 'cancelled_by_customer'), 'cancelled_by_customer');
  assert.equal(localStatusAfterGatewayUpdate('pending', 'expired'), 'expired');
  assert.equal(localStatusAfterGatewayUpdate('processing', 'superseded'), 'superseded');
});

test('terminal and unknown gateway states close or quarantine an attempt', () => {
  assert.equal(localStatusAfterGatewayUpdate('success', 'active'), 'closed');
  assert.equal(localStatusAfterGatewayUpdate('failed', 'active'), 'closed');
  assert.equal(localStatusAfterGatewayUpdate('failed', 'cancelled_by_customer'), 'cancelled_by_customer');
  assert.equal(localStatusAfterGatewayUpdate('unexpected', 'active'), 'review_required');
});

test('success after cancellation, expiry, or supersession requires owner review', () => {
  assert.equal(successfulPaymentNeedsCancellationReview('cancelled', 'closed'), true);
  assert.equal(successfulPaymentNeedsCancellationReview('payment_expired', 'closed'), true);
  assert.equal(successfulPaymentNeedsCancellationReview('payment_pending', 'cancelled_by_customer'), true);
  assert.equal(successfulPaymentNeedsCancellationReview('payment_pending', 'superseded'), true);
  assert.equal(successfulPaymentNeedsCancellationReview('payment_pending', 'active'), false);
});
