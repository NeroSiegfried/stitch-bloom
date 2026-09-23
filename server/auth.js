import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db.js';
import { HttpError } from './http.js';

const COOKIE_NAME = 'sb_session';
const PASSWORD_RESET_COOKIE_NAME = 'sb_password_reset';
export const PASSWORD_HASH_ROUNDS = 12;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new HttpError(503, 'Session authentication has not been configured yet.');
  }
  return new TextEncoder().encode(secret);
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    if (index < 0) return ['', ''];
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
  }).filter(([key]) => key));
}

function appendCookie(res, cookie) {
  const current = res.getHeader?.('Set-Cookie');
  if (!current) return res.setHeader('Set-Cookie', cookie);
  const cookies = Array.isArray(current) ? current : [current];
  return res.setHeader('Set-Cookie', [...cookies, cookie]);
}

export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw new HttpError(400, 'Use a password between 8 and 128 characters.');
  }
  // bcrypt embeds a fresh cryptographically random salt in every hash. Keeping
  // the work factor here gives sign-in a single place to detect older hashes.
  return bcrypt.hash(password, PASSWORD_HASH_ROUNDS);
}

export async function verifyPassword(password, hash) {
  if (typeof hash !== 'string' || !hash) return false;
  return bcrypt.compare(password, hash);
}

export function passwordNeedsRehash(hash) {
  if (typeof hash !== 'string' || !hash) return false;
  try {
    return bcrypt.getRounds(hash) < PASSWORD_HASH_ROUNDS;
  } catch {
    return true;
  }
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    addressLine1: user.address_line1,
    addressLine2: user.address_line2,
    city: user.city,
    state: user.state,
    landmark: user.landmark,
    emailVerified: Boolean(user.email_verified_at),
  };
}

export async function createSession(res, user) {
  const token = await new SignJWT({ role: user.role, sv: Number(user.session_version || 0) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey());
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
}

export function clearSession(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function createPasswordResetTicket(res, user) {
  const token = await new SignJWT({ purpose: 'password_reset', sv: Number(user.session_version || 0) })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setAudience('password-reset')
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secretKey());
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${PASSWORD_RESET_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=600${secure}`);
}

export function clearPasswordResetTicket(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  appendCookie(res, `${PASSWORD_RESET_COOKIE_NAME}=; Path=/api/auth; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

export async function passwordResetUser(req) {
  const token = parseCookies(req.headers.cookie)[PASSWORD_RESET_COOKIE_NAME];
  const invalid = () => new HttpError(401, 'Confirm a new reset code before choosing your password.', {
    code: 'PASSWORD_RESET_CONFIRMATION_REQUIRED',
  });
  if (!token) throw invalid();
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      audience: 'password-reset',
    });
    if (payload.purpose !== 'password_reset') throw invalid();
    const [user] = await db()`
      SELECT id, email, session_version
      FROM users
      WHERE id = ${payload.sub} AND email_verified_at IS NOT NULL
    `;
    if (!user || Number(payload.sv || 0) !== Number(user.session_version || 0)) throw invalid();
    return user;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw invalid();
  }
}

export async function currentUser(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ['HS256'] });
    const [user] = await db()`
      SELECT id, email, role, first_name, last_name, phone, address_line1,
             address_line2, city, state, landmark, email_verified_at, session_version
      FROM users WHERE id = ${payload.sub}
    `;
    if (!user || Number(payload.sv || 0) !== Number(user.session_version || 0)) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser(req) {
  const user = await currentUser(req);
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}

export async function requireAdmin(req) {
  const user = await requireUser(req);
  if (user.role !== 'admin') throw new HttpError(403, 'Owner access is required.');
  return user;
}
