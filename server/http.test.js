import test from 'node:test';
import assert from 'node:assert/strict';
import { handleError, HttpError } from './http.js';

test('exposes stable payment error codes to callback polling clients', () => {
  const response = {
    statusCode: 0,
    headers: {},
    body: '',
    status(value) { this.statusCode = value; return this; },
    setHeader(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; return value; },
  };
  handleError(response, new HttpError(409, 'The payment is still pending.', {
    code: 'PAYMENT_PENDING',
  }));
  assert.equal(response.statusCode, 409);
  assert.deepEqual(JSON.parse(response.body), {
    error: 'The payment is still pending.',
    code: 'PAYMENT_PENDING',
  });
});
