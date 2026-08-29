import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from 'jose';
import { createSession } from './auth.js';
import { db } from './db.js';
import { appUrl, HttpError } from './http.js';

const GOOGLE_AUTHORIZATION_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_JWKS = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const APPLE_AUTHORIZATION_URL = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
const APPLE_JWKS = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

function value(name) {
  return String(process.env[name] || '').trim();
}

export function oauthProviderConfigured(provider) {
  if (provider === 'google') return Boolean(value('GOOGLE_CLIENT_ID') && value('GOOGLE_CLIENT_SECRET'));
  if (provider === 'apple') {
    return Boolean(value('APPLE_CLIENT_ID') && value('APPLE_TEAM_ID')
      && value('APPLE_KEY_ID') && value('APPLE_PRIVATE_KEY'));
  }
  return false;
}

export function visibleOauthProviders() {
  const enabled = value('AUTH_OAUTH_UI_ENABLED').toLowerCase() === 'true';
  return {
    google: enabled && oauthProviderConfigured('google'),
    apple: enabled && oauthProviderConfigured('apple'),
  };
}

function stateSecret() {
  const secret = value('SESSION_SECRET');
  if (secret.length < 32) throw new HttpError(503, 'Session authentication has not been configured yet.');
  return secret;
}

function stateDigest(state) {
  return createHmac('sha256', stateSecret()).update(`oauth\0${state}`).digest('hex');
}

function base64url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function safeReturnTo(candidate) {
  const path = String(candidate || '/account');
  return /^\/(account|checkout)(?:[/?].*)?$/.test(path) ? path : '/account';
}

function callbackUrl(req, provider) {
  return `${appUrl(req)}/api/auth/${provider}-callback`;
}

async function createOauthState(req, provider) {
  const state = base64url(randomBytes(32));
  const nonce = base64url(randomBytes(32));
  const codeVerifier = base64url(randomBytes(48));
  await db()`
    INSERT INTO oauth_states (
      id, state_hash, provider, nonce, code_verifier, return_to, expires_at
    ) VALUES (
      ${randomUUID()}, ${stateDigest(state)}, ${provider}, ${nonce}, ${codeVerifier},
      ${safeReturnTo(req.query.returnTo)}, NOW() + INTERVAL '10 minutes'
    )
  `;
  return { state, nonce, codeVerifier };
}

async function consumeOauthState(provider, state) {
  if (!state) throw new HttpError(400, 'The sign-in request could not be verified.');
  const [saved] = await db()`
    UPDATE oauth_states SET consumed_at = NOW()
    WHERE state_hash = ${stateDigest(state)}
      AND provider = ${provider}
      AND consumed_at IS NULL
      AND expires_at > NOW()
    RETURNING nonce, code_verifier, return_to
  `;
  if (!saved) throw new HttpError(400, 'The sign-in request expired or was already used.');
  return saved;
}

async function tokenRequest(url, fields) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(7_000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(fields),
    });
  } catch (error) {
    console.error(`OAuth token exchange failed: ${error.message}`);
    throw new HttpError(502, 'The identity provider could not be reached. Please try again.');
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id_token) {
    console.error(`OAuth token exchange returned HTTP ${response.status}: ${payload?.error || 'invalid response'}`);
    throw new HttpError(400, 'The identity provider did not complete sign-in.');
  }
  return payload;
}

async function appleClientSecret() {
  const privateKey = value('APPLE_PRIVATE_KEY').replaceAll('\\n', '\n');
  const key = await importPKCS8(privateKey, 'ES256');
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: value('APPLE_KEY_ID') })
    .setIssuer(value('APPLE_TEAM_ID'))
    .setSubject(value('APPLE_CLIENT_ID'))
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(key);
}

function verifiedEmail(payload) {
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  const email = String(payload.email || '').trim().toLowerCase();
  if (!verified || !/^\S+@\S+\.\S+$/.test(email)) {
    throw new HttpError(400, 'The identity provider did not return a verified email address.');
  }
  return email;
}

function fallbackName(email) {
  const words = email.split('@')[0].replace(/[^a-z0-9]+/gi, ' ').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: words[0] || 'Stitch Bloom',
    lastName: words.slice(1).join(' ') || 'Customer',
  };
}

async function findOrCreateOauthUser({ provider, subject, email, firstName, lastName }) {
  const sql = db();
  return sql.begin(async (tx) => {
    const [linked] = await tx`
      SELECT users.id, users.email, users.role, users.first_name, users.last_name,
             users.phone, users.address_line1, users.address_line2, users.city,
             users.state, users.landmark, users.email_verified_at, users.session_version
      FROM auth_accounts
      JOIN users ON users.id = auth_accounts.user_id
      WHERE auth_accounts.provider = ${provider} AND auth_accounts.provider_subject = ${subject}
      FOR UPDATE OF users
    `;
    if (linked) return linked;

    let [user] = await tx`
      SELECT id, email, role, first_name, last_name, phone, address_line1,
             address_line2, city, state, landmark, email_verified_at, session_version
      FROM users WHERE email = ${email}
      FOR UPDATE
    `;
    if (!user) {
      const fallback = fallbackName(email);
      [user] = await tx`
        INSERT INTO users (
          id, email, password_hash, role, first_name, last_name, email_verified_at
        ) VALUES (
          ${randomUUID()}, ${email}, NULL, 'customer',
          ${String(firstName || fallback.firstName).slice(0, 80)},
          ${String(lastName || fallback.lastName).slice(0, 80)}, NOW()
        )
        RETURNING id, email, role, first_name, last_name, phone, address_line1,
                  address_line2, city, state, landmark, email_verified_at, session_version
      `;
    } else if (!user.email_verified_at) {
      [user] = await tx`
        UPDATE users SET email_verified_at = NOW(), updated_at = NOW()
        WHERE id = ${user.id}
        RETURNING id, email, role, first_name, last_name, phone, address_line1,
                  address_line2, city, state, landmark, email_verified_at, session_version
      `;
    }
    await tx`
      INSERT INTO auth_accounts (id, user_id, provider, provider_subject, provider_email)
      VALUES (${randomUUID()}, ${user.id}, ${provider}, ${subject}, ${email})
      ON CONFLICT (provider, provider_subject) DO NOTHING
    `;
    return user;
  });
}

export async function beginOauth(req, res, provider) {
  if (!oauthProviderConfigured(provider)) throw new HttpError(404, 'This sign-in method is not available yet.');
  const { state, nonce, codeVerifier } = await createOauthState(req, provider);
  const redirectUri = callbackUrl(req, provider);
  let authorization;
  if (provider === 'google') {
    const challenge = base64url(createHash('sha256').update(codeVerifier).digest());
    authorization = new URL(GOOGLE_AUTHORIZATION_URL);
    authorization.search = new URLSearchParams({
      client_id: value('GOOGLE_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    });
  } else {
    authorization = new URL(APPLE_AUTHORIZATION_URL);
    authorization.search = new URLSearchParams({
      client_id: value('APPLE_CLIENT_ID'),
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state,
      nonce,
    });
  }
  return res.redirect(302, authorization.toString());
}

export async function finishOauth(req, res, provider, fields) {
  const state = await consumeOauthState(provider, fields.state);
  if (fields.error) {
    return res.redirect(302, `${appUrl(req)}/#/account?auth=oauth-cancelled`);
  }
  if (!fields.code) throw new HttpError(400, 'The identity provider did not return an authorization code.');
  const redirectUri = callbackUrl(req, provider);
  let identity;
  let suppliedName;
  if (provider === 'google') {
    const token = await tokenRequest(GOOGLE_TOKEN_URL, {
      code: fields.code,
      client_id: value('GOOGLE_CLIENT_ID'),
      client_secret: value('GOOGLE_CLIENT_SECRET'),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      code_verifier: state.code_verifier,
    });
    const verified = await jwtVerify(token.id_token, GOOGLE_JWKS, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: value('GOOGLE_CLIENT_ID'),
      algorithms: ['RS256'],
    });
    if (verified.payload.nonce !== state.nonce) throw new HttpError(400, 'The sign-in response could not be verified.');
    identity = verified.payload;
    suppliedName = { firstName: identity.given_name, lastName: identity.family_name };
  } else {
    const token = await tokenRequest(APPLE_TOKEN_URL, {
      code: fields.code,
      client_id: value('APPLE_CLIENT_ID'),
      client_secret: await appleClientSecret(),
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });
    const verified = await jwtVerify(token.id_token, APPLE_JWKS, {
      issuer: 'https://appleid.apple.com',
      audience: value('APPLE_CLIENT_ID'),
      algorithms: ['RS256'],
    });
    if (verified.payload.nonce !== state.nonce) throw new HttpError(400, 'The sign-in response could not be verified.');
    identity = verified.payload;
    try {
      const user = typeof fields.user === 'string' ? JSON.parse(fields.user) : fields.user;
      suppliedName = { firstName: user?.name?.firstName, lastName: user?.name?.lastName };
    } catch {
      suppliedName = {};
    }
  }

  const user = await findOrCreateOauthUser({
    provider,
    subject: String(identity.sub),
    email: verifiedEmail(identity),
    ...suppliedName,
  });
  await createSession(res, user);
  return res.redirect(302, `${appUrl(req)}/#${safeReturnTo(state.return_to)}?auth=oauth-success`);
}
