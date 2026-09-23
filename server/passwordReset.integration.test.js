import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test, { mock } from 'node:test';
import { hashPassword, verifyPassword } from './auth.js';
import { issueOtp } from './authChallenges.js';
import { AUTH_ROUTES } from './authRoutes.js';
import { db } from './db.js';

function response() {
  return {
    headers: {},
    status(code) { this.statusCode = code; return this; },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; return this; },
    end(body) { this.body = JSON.parse(body); return this; },
  };
}

function request(body) {
  return { method: 'POST', headers: { 'x-forwarded-for': '198.51.100.42' }, body };
}

test('a delivered reset code changes the password once and invalidates the old password', {
  skip: !process.env.RUN_DB_INTEGRATION || !process.env.DATABASE_URL,
}, async () => {
  const sql = db();
  const id = randomUUID();
  const email = `codex-reset-${id}@example.invalid`;
  const oldPassword = `old-${randomUUID()}`;
  const newPassword = `new-${randomUUID()}`;
  const sent = [];
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.AUTH_EMAIL_FROM;

  try {
    process.env.RESEND_API_KEY = 're_integration_test';
    process.env.AUTH_EMAIL_FROM = 'The Stitch Bloom <accounts@example.invalid>';
    mock.method(globalThis, 'fetch', async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return new Response(JSON.stringify({ id: `test-email-${sent.length}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const oldHash = await hashPassword(oldPassword);
    await sql`
      INSERT INTO users (id, email, password_hash, first_name, last_name, email_verified_at)
      VALUES (${id}, ${email}, ${oldHash}, 'Reset', 'Test', NOW())
    `;

    await issueOtp({ req: request({}), email, userId: id, purpose: 'password_reset' });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to[0], email);
    const code = sent[0].text.match(/\b\d{6}\b/)?.[0];
    assert.ok(code);

    const wrongCode = String((Number(code) + 1) % 1_000_000).padStart(6, '0');
    await assert.rejects(
      AUTH_ROUTES['reset-password'](request({
        email, code: wrongCode, password: newPassword, confirmPassword: newPassword,
      }), response()),
      { status: 400, code: 'OTP_INVALID' },
    );

    const resetResponse = response();
    await AUTH_ROUTES['reset-password'](request({
      email, code, password: newPassword, confirmPassword: newPassword,
    }), resetResponse);
    assert.equal(resetResponse.statusCode, 200);
    assert.match(resetResponse.headers['set-cookie'], /Max-Age=0/);
    assert.equal(sent.length, 2);
    assert.match(sent[1].subject, /password was changed/i);

    const [user] = await sql`
      SELECT password_hash, session_version FROM users WHERE id = ${id}
    `;
    assert.equal(await verifyPassword(oldPassword, user.password_hash), false);
    assert.equal(await verifyPassword(newPassword, user.password_hash), true);
    assert.equal(user.session_version, 1);

    await assert.rejects(
      AUTH_ROUTES['reset-password'](request({
        email, code, password: newPassword, confirmPassword: newPassword,
      }), response()),
      { status: 400, code: 'OTP_INVALID' },
    );

    const signInResponse = response();
    await AUTH_ROUTES.signin(request({ email, password: newPassword }), signInResponse);
    assert.equal(signInResponse.statusCode, 200);
    assert.equal(signInResponse.body.user.id, id);
    assert.match(signInResponse.headers['set-cookie'], /sb_session=/);
    await assert.rejects(
      AUTH_ROUTES.signin(request({ email, password: oldPassword }), response()),
      { status: 401 },
    );
  } finally {
    await sql`DELETE FROM users WHERE id = ${id}`;
    await sql.end();
    mock.restoreAll();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.AUTH_EMAIL_FROM;
    else process.env.AUTH_EMAIL_FROM = originalFrom;
  }
});
