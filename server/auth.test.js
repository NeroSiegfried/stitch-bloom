import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, passwordNeedsRehash, verifyPassword } from './auth.js';

test('bcrypt salts identical passwords independently', async () => {
  const [first, second] = await Promise.all([
    hashPassword('a-valid-password'),
    hashPassword('a-valid-password'),
  ]);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('a-valid-password', first), true);
  assert.equal(await verifyPassword('not-the-password', first), false);
  assert.equal(passwordNeedsRehash(first), false);
});

test('password verification safely rejects OAuth-only accounts', async () => {
  assert.equal(await verifyPassword('anything', null), false);
  assert.equal(passwordNeedsRehash(null), false);
});
