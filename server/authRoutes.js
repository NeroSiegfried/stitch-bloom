import { randomUUID } from 'node:crypto';
import {
  clearSession,
  createSession,
  currentUser,
  hashPassword,
  passwordNeedsRehash,
  publicUser,
  verifyPassword,
} from './auth.js';
import { issueOtp, normalizeEmail, validEmail, verifyOtp } from './authChallenges.js';
import { db } from './db.js';
import { authEmailConfigured, sendPasswordChanged } from './email.js';
import { allowMethods, appUrl, assertSameOrigin, HttpError, json, readForm, readJson, text } from './http.js';
import { beginOauth, finishOauth, visibleOauthProviders } from './oauth.js';

const ACCOUNT_FIELDS = `
  id, email, password_hash, role, first_name, last_name, phone,
  address_line1, address_line2, city, state, landmark,
  email_verified_at, session_version
`;

function ensureEmail(value) {
  const email = normalizeEmail(value);
  if (!validEmail(email)) throw new HttpError(400, 'Enter a valid email address.');
  return email;
}

function genericResetMessage() {
  return 'If that address belongs to an account, a six-digit code is on its way.';
}

function waitForMinimum(startedAt, milliseconds = 450) {
  const remaining = milliseconds - (Date.now() - startedAt);
  return remaining > 0 ? new Promise((resolve) => setTimeout(resolve, remaining)) : Promise.resolve();
}

async function me(req, res) {
  allowMethods(req, ['GET']);
  return json(res, 200, { user: publicUser(await currentUser(req)) });
}

async function providers(req, res) {
  allowMethods(req, ['GET']);
  return json(res, 200, {
    emailVerification: authEmailConfigured(),
    passwordRecovery: authEmailConfigured(),
    oauth: visibleOauthProviders(),
  });
}

async function signin(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  const sql = db();
  let [user] = await sql.unsafe(`SELECT ${ACCOUNT_FIELDS} FROM users WHERE email = $1`, [email]);
  if (!user || !(await verifyPassword(body.password || '', user.password_hash))) {
    throw new HttpError(401, 'The email or password is incorrect.');
  }

  if (!user.email_verified_at && authEmailConfigured()) {
    try {
      await issueOtp({ req, email, userId: user.id, purpose: 'email_verification' });
    } catch (error) {
      if (error.status !== 429) throw error;
    }
    throw new HttpError(403, 'Confirm your email with the code we sent before signing in.', {
      code: 'EMAIL_VERIFICATION_REQUIRED',
    });
  }

  const newHash = passwordNeedsRehash(user.password_hash)
    ? await hashPassword(body.password)
    : null;
  if (!user.email_verified_at || newHash) {
    [user] = await sql`
      UPDATE users SET
        email_verified_at = COALESCE(email_verified_at, NOW()),
        password_hash = COALESCE(${newHash}, password_hash),
        updated_at = NOW()
      WHERE id = ${user.id}
      RETURNING id, email, password_hash, role, first_name, last_name, phone,
                address_line1, address_line2, city, state, landmark,
                email_verified_at, session_version
    `;
  }
  await createSession(res, user);
  return json(res, 200, { user: publicUser(user) });
}

function signout(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  clearSession(res);
  return json(res, 200, { ok: true });
}

async function signup(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  const firstName = text(body.firstName, 80);
  const lastName = text(body.lastName, 80);
  if (!firstName || !lastName) throw new HttpError(400, 'First and last name are required.');

  const passwordHash = await hashPassword(body.password);
  const sql = db();
  const [existing] = await sql`
    SELECT id, email_verified_at FROM users WHERE email = ${email}
  `;
  if (existing?.email_verified_at) throw new HttpError(409, 'An account already exists for this email address.');

  const emailVerification = authEmailConfigured();
  const [user] = existing
    ? await sql`
        UPDATE users SET password_hash = ${passwordHash}, first_name = ${firstName},
          last_name = ${lastName}, phone = ${text(body.phone, 40) || null}, updated_at = NOW()
        WHERE id = ${existing.id}
        RETURNING id, email, role, first_name, last_name, phone, address_line1,
                  address_line2, city, state, landmark, email_verified_at, session_version
      `
    : await sql`
        INSERT INTO users (
          id, email, password_hash, role, first_name, last_name, phone, email_verified_at
        ) VALUES (
          ${randomUUID()}, ${email}, ${passwordHash}, 'customer',
          ${firstName}, ${lastName}, ${text(body.phone, 40) || null},
          ${emailVerification ? null : new Date()}
        )
        RETURNING id, email, role, first_name, last_name, phone, address_line1,
                  address_line2, city, state, landmark, email_verified_at, session_version
      `;

  if (emailVerification) {
    await issueOtp({ req, email, userId: user.id, purpose: 'email_verification' });
    return json(res, 202, {
      verificationRequired: true,
      email,
      message: 'We sent a six-digit confirmation code to your email.',
    });
  }
  await createSession(res, user);
  return json(res, 201, { user: publicUser(user) });
}

async function verifyEmail(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  await verifyOtp({ email, purpose: 'email_verification', code: body.code });
  const [user] = await db()`
    UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
    WHERE email = ${email}
    RETURNING id, email, role, first_name, last_name, phone, address_line1,
              address_line2, city, state, landmark, email_verified_at, session_version
  `;
  if (!user) throw new HttpError(400, 'That confirmation code is not valid.');
  await createSession(res, user);
  return json(res, 200, { user: publicUser(user) });
}

async function resendVerification(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  if (!authEmailConfigured()) throw new HttpError(503, 'Email verification is temporarily unavailable.');
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  const [user] = await db()`SELECT id, email_verified_at FROM users WHERE email = ${email}`;
  if (user && !user.email_verified_at) {
    await issueOtp({ req, email, userId: user.id, purpose: 'email_verification' });
  }
  return json(res, 200, { message: 'If confirmation is still needed, a new code is on its way.' });
}

async function forgotPassword(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  if (!authEmailConfigured()) throw new HttpError(503, 'Password recovery is temporarily unavailable.');
  const startedAt = Date.now();
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  const [user] = await db()`SELECT id, email_verified_at FROM users WHERE email = ${email}`;
  if (user?.email_verified_at) {
    try {
      await issueOtp({ req, email, userId: user.id, purpose: 'password_reset' });
    } catch (error) {
      // Keep the response indistinguishable from an unknown address. Provider
      // failures are logged for the owner; the customer can retry without the
      // endpoint becoming an account-enumeration oracle.
      console.error(`Password-reset code delivery failed: ${error.message}`);
    }
  }
  await waitForMinimum(startedAt);
  return json(res, 200, { message: genericResetMessage() });
}

async function resetPassword(req, res) {
  allowMethods(req, ['POST']);
  assertSameOrigin(req);
  const body = await readJson(req);
  const email = ensureEmail(body.email);
  if (body.password !== body.confirmPassword) throw new HttpError(400, 'The passwords do not match.');
  const passwordHash = await hashPassword(body.password);
  await verifyOtp({ email, purpose: 'password_reset', code: body.code });
  const [user] = await db()`
    UPDATE users SET password_hash = ${passwordHash}, session_version = session_version + 1,
      updated_at = NOW()
    WHERE email = ${email} AND email_verified_at IS NOT NULL
    RETURNING id
  `;
  if (!user) throw new HttpError(400, 'That reset code is not valid.');
  clearSession(res);
  sendPasswordChanged({ to: email }).catch((error) => {
    console.error(`Password-change notice failed: ${error.message}`);
  });
  return json(res, 200, { message: 'Your password has been updated. Sign in with the new password.' });
}

function beginGoogle(req, res) {
  allowMethods(req, ['GET']);
  return beginOauth(req, res, 'google');
}

function beginApple(req, res) {
  allowMethods(req, ['GET']);
  return beginOauth(req, res, 'apple');
}

async function oauthCallback(req, res, provider) {
  try {
    allowMethods(req, provider === 'apple' ? ['POST'] : ['GET']);
    const fields = provider === 'apple' ? await readForm(req) : req.query;
    return await finishOauth(req, res, provider, fields);
  } catch (error) {
    console.error(`${provider} OAuth callback failed: ${error.message}`);
    return res.redirect(302, `${appUrl(req)}/#/account?auth=oauth-error`);
  }
}

const googleCallback = (req, res) => oauthCallback(req, res, 'google');
const appleCallback = (req, res) => oauthCallback(req, res, 'apple');

export const AUTH_ROUTES = {
  me,
  providers,
  signin,
  signout,
  signup,
  'verify-email': verifyEmail,
  'resend-verification': resendVerification,
  'forgot-password': forgotPassword,
  'reset-password': resetPassword,
  google: beginGoogle,
  apple: beginApple,
  'google-callback': googleCallback,
  'apple-callback': appleCallback,
};
