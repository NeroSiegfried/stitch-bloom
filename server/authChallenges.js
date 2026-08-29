import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { sendAuthCode } from './email.js';
import { HttpError } from './http.js';

export const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_MIN_RESEND_SECONDS = 60;
const OTP_MAX_SENDS_PER_HOUR = 5;
const PURPOSES = new Set(['email_verification', 'password_reset']);

function challengeSecret() {
  const secret = String(process.env.OTP_SECRET || process.env.SESSION_SECRET || '');
  if (secret.length < 32) throw new HttpError(503, 'Account verification has not been configured yet.');
  return secret;
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase().slice(0, 254);
}

export function validEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

export function otpDigest(email, purpose, code) {
  return createHmac('sha256', challengeSecret())
    .update(`${purpose}\0${normalizeEmail(email)}\0${String(code)}`)
    .digest('hex');
}

function requestFingerprint(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const address = forwarded || req.socket?.remoteAddress || 'unknown';
  return createHmac('sha256', challengeSecret()).update(`ip\0${address}`).digest('hex');
}

function safeEqualHex(left, right) {
  const a = Buffer.from(String(left), 'hex');
  const b = Buffer.from(String(right), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function issueOtp({ req, email, userId = null, purpose }) {
  const normalizedEmail = normalizeEmail(email);
  if (!PURPOSES.has(purpose)) throw new HttpError(500, 'Unknown authentication challenge purpose.');
  const sql = db();
  const fingerprint = requestFingerprint(req);
  const [limits] = await sql`
    SELECT
      MAX(created_at) FILTER (WHERE email = ${normalizedEmail}) AS last_sent_at,
      COUNT(*) FILTER (
        WHERE email = ${normalizedEmail}
          AND created_at > NOW() - INTERVAL '1 hour'
      )::int AS account_hour,
      COUNT(*) FILTER (
        WHERE request_ip_hash = ${fingerprint}
          AND created_at > NOW() - INTERVAL '1 hour'
      )::int AS ip_hour
    FROM auth_challenges
    WHERE (email = ${normalizedEmail} OR request_ip_hash = ${fingerprint})
      AND purpose = ${purpose}
  `;
  const secondsSinceLast = limits?.last_sent_at
    ? (Date.now() - new Date(limits.last_sent_at).getTime()) / 1000
    : Infinity;
  if (secondsSinceLast < OTP_MIN_RESEND_SECONDS
      || Number(limits?.account_hour || 0) >= OTP_MAX_SENDS_PER_HOUR
      || Number(limits?.ip_hour || 0) >= OTP_MAX_SENDS_PER_HOUR * 4) {
    throw new HttpError(429, 'Please wait before requesting another code.', { code: 'OTP_RATE_LIMITED' });
  }

  const id = randomUUID();
  const code = String(randomInt(100_000, 1_000_000));
  const codeHash = otpDigest(normalizedEmail, purpose, code);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE auth_challenges SET consumed_at = NOW()
      WHERE email = ${normalizedEmail} AND purpose = ${purpose} AND consumed_at IS NULL
    `;
    await tx`
      INSERT INTO auth_challenges (
        id, user_id, email, purpose, code_hash, request_ip_hash, expires_at
      ) VALUES (
        ${id}, ${userId}, ${normalizedEmail}, ${purpose}, ${codeHash}, ${fingerprint},
        NOW() + (${OTP_TTL_MINUTES} * INTERVAL '1 minute')
      )
    `;
  });

  try {
    await sendAuthCode({ to: normalizedEmail, code, purpose, idempotencyKey: `auth-${id}` });
  } catch (error) {
    await sql`DELETE FROM auth_challenges WHERE id = ${id}`;
    throw error;
  }
  return { expiresInMinutes: OTP_TTL_MINUTES };
}

export async function verifyOtp({ email, purpose, code }) {
  const normalizedEmail = normalizeEmail(email);
  const suppliedCode = String(code ?? '').trim();
  if (!/^\d{6}$/.test(suppliedCode)) {
    throw new HttpError(400, 'Enter the six-digit code from your email.', { code: 'OTP_INVALID' });
  }
  const sql = db();
  const outcome = await sql.begin(async (tx) => {
    const [challenge] = await tx`
      SELECT id, code_hash, attempts, expires_at
      FROM auth_challenges
      WHERE email = ${normalizedEmail} AND purpose = ${purpose} AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `;
    if (!challenge) return 'invalid';
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      await tx`UPDATE auth_challenges SET consumed_at = NOW() WHERE id = ${challenge.id}`;
      return 'expired';
    }
    const matches = safeEqualHex(challenge.code_hash, otpDigest(normalizedEmail, purpose, suppliedCode));
    if (!matches) {
      const attempts = Number(challenge.attempts) + 1;
      await tx`
        UPDATE auth_challenges
        SET attempts = ${attempts}, consumed_at = CASE WHEN ${attempts} >= ${OTP_MAX_ATTEMPTS} THEN NOW() ELSE NULL END
        WHERE id = ${challenge.id}
      `;
      return attempts >= OTP_MAX_ATTEMPTS ? 'locked' : 'invalid';
    }
    await tx`
      UPDATE auth_challenges SET consumed_at = NOW()
      WHERE email = ${normalizedEmail} AND purpose = ${purpose} AND consumed_at IS NULL
    `;
    return 'valid';
  });

  if (outcome === 'expired') throw new HttpError(400, 'That code has expired. Request a new one.', { code: 'OTP_EXPIRED' });
  if (outcome === 'locked') throw new HttpError(429, 'Too many incorrect attempts. Request a new code.', { code: 'OTP_RATE_LIMITED' });
  if (outcome !== 'valid') throw new HttpError(400, 'That code is not correct.', { code: 'OTP_INVALID' });
}
