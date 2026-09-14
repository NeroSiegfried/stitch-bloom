import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { authEmailConfigured, sendAuthCode } from './email.js';

test('Resend-backed account email requires both the key and sender', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.AUTH_EMAIL_FROM;
  const requests = [];
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.AUTH_EMAIL_FROM;
    assert.equal(authEmailConfigured(), false);

    process.env.RESEND_API_KEY = 're_test_only';
    assert.equal(authEmailConfigured(), false);
    process.env.AUTH_EMAIL_FROM = 'The Stitch Bloom <accounts@example.com>';
    assert.equal(authEmailConfigured(), true);

    mock.method(globalThis, 'fetch', async (url, options) => {
      requests.push({ url, options });
      return new Response(JSON.stringify({ id: 'email-id' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const result = await sendAuthCode({
      to: 'customer@example.com',
      code: '123456',
      purpose: 'password_reset',
      idempotencyKey: 'auth-challenge-id',
    });
    assert.equal(result, 'email-id');
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, 'https://api.resend.com/emails');
    assert.equal(requests[0].options.headers['Idempotency-Key'], 'auth-challenge-id');
    const body = JSON.parse(requests[0].options.body);
    assert.equal(body.to[0], 'customer@example.com');
    assert.match(body.subject, /reset/i);
    assert.match(body.text, /123456/);
  } finally {
    mock.restoreAll();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = originalFrom;
  }
});
