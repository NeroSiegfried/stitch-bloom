import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { authEmailConfigured, authEmailReady, sendAuthCode } from './email.js';

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

test('account email readiness requires Resend DNS records', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.AUTH_EMAIL_FROM;
  try {
    process.env.RESEND_API_KEY = 're_dns_test';
    process.env.AUTH_EMAIL_FROM = 'The Stitch Bloom <accounts@shop.example>';
    const lookups = [];
    const resolver = {
      async resolveTxt(name) {
        lookups.push(['TXT', name]);
        if (name === 'resend._domainkey.shop.example') return [['p=public-key']];
        if (name === 'send.shop.example') return [['v=spf1 include:amazonses.com ~all']];
        throw new Error('unexpected TXT lookup');
      },
      async resolveMx(name) {
        lookups.push(['MX', name]);
        return [{ priority: 10, exchange: 'feedback-smtp.us-east-1.amazonses.com' }];
      },
    };

    assert.equal(await authEmailReady({ resolver, bypassCache: true }), true);
    assert.deepEqual(lookups, [
      ['TXT', 'resend._domainkey.shop.example'],
      ['TXT', 'send.shop.example'],
      ['MX', 'send.shop.example'],
    ]);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = originalFrom;
  }
});

test('account email readiness accepts Resend managed sending records', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.AUTH_EMAIL_FROM;
  try {
    process.env.RESEND_API_KEY = 're_managed_dns_test';
    process.env.AUTH_EMAIL_FROM = 'The Stitch Bloom <accounts@shop.example>';
    const resolver = {
      async resolveTxt(name) {
        if (name === 'resend._domainkey.shop.example') return [['p=public-key']];
        if (name === 'send.shop.example') {
          return [['v=spf1 ip4:192.0.2.10 ip4:192.0.2.11 ~all']];
        }
        throw new Error('unexpected TXT lookup');
      },
      async resolveMx(name) {
        assert.equal(name, 'send.shop.example');
        return [{ priority: 10, exchange: 'feedback.forge.rmta.net' }];
      },
    };

    assert.equal(await authEmailReady({ resolver, bypassCache: true }), true);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = originalFrom;
  }
});

test('account email readiness is false when required DNS is missing', async () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.AUTH_EMAIL_FROM;
  try {
    process.env.RESEND_API_KEY = 're_missing_dns_test';
    process.env.AUTH_EMAIL_FROM = 'accounts@shop.example';
    const resolver = {
      async resolveTxt() {
        throw new Error('ENOTFOUND');
      },
      async resolveMx() {
        throw new Error('ENOTFOUND');
      },
    };
    assert.equal(await authEmailReady({ resolver, bypassCache: true }), false);
  } finally {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = originalFrom;
  }
});
