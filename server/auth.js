import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db.js';
import { HttpError } from './http.js';

const COOKIE_NAME = 'sb_session';
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
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`);
}

export function clearSession(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
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
