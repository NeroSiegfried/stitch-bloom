import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRefundStatus, refundIdentifiers, refundOutcome } from './refundLifecycle.js';

test('normalizes all documented nonterminal refund states', () => {
  assert.equal(normalizeRefundStatus('PENDING'), 'pending');
  assert.equal(normalizeRefundStatus('needs_attention'), 'needs-attention');
  assert.equal(refundOutcome('processing').paymentStatus, 'refund_pending');
  assert.equal(refundOutcome('needs-attention').orderStatus, 'refund_pending');
});

test('maps terminal refund outcomes without losing the previous order status', () => {
  assert.deepEqual(refundOutcome('processed'), {
    status: 'processed', paymentStatus: 'refunded', orderStatus: 'cancelled', terminal: true,
  });
  assert.deepEqual(refundOutcome('failed', 'paid_after_cancel_review'), {
    status: 'failed', paymentStatus: 'paid', orderStatus: 'paid_after_cancel_review', terminal: true,
  });
});

test('extracts identifiers from API responses and webhook payloads', () => {
  assert.deepEqual(refundIdentifiers({ id: 42, transaction: { id: 7, reference: 'SB-api' } }), {
    refundId: '42', refundReference: '', transactionId: '7', transactionReference: 'SB-api',
  });
  assert.deepEqual(refundIdentifiers({
    refund_reference: 'RF-webhook', transaction_reference: 'SB-webhook',
  }), {
    refundId: '', refundReference: 'RF-webhook', transactionId: '', transactionReference: 'SB-webhook',
  });
});
