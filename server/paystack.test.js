import assert from 'node:assert/strict';
import test from 'node:test';
import { paymentMode } from './paystack.js';

test('derives the public payment mode from the server-only Paystack key', () => {
  const originalKey = process.env.PAYSTACK_SECRET_KEY;
  const originalVercelEnvironment = process.env.VERCEL_ENV;
  try {
    process.env.PAYSTACK_SECRET_KEY = `sk_test_${'a'.repeat(40)}`;
    process.env.VERCEL_ENV = 'preview';
    assert.equal(paymentMode(), 'test');

    process.env.PAYSTACK_SECRET_KEY = `sk_live_${'b'.repeat(40)}`;
    process.env.VERCEL_ENV = 'production';
    assert.equal(paymentMode(), 'live');
  } finally {
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalKey;
    if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnvironment;
  }
});

test('refuses a live key in preview even when the client claims nothing', () => {
  const originalKey = process.env.PAYSTACK_SECRET_KEY;
  const originalVercelEnvironment = process.env.VERCEL_ENV;
  try {
    process.env.PAYSTACK_SECRET_KEY = `sk_live_${'c'.repeat(40)}`;
    process.env.VERCEL_ENV = 'preview';
    assert.throws(() => paymentMode(), /only use Paystack test keys/i);
  } finally {
    if (originalKey === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = originalKey;
    if (originalVercelEnvironment === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercelEnvironment;
  }
});
