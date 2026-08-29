export class HttpError extends Error {
  /**
   * `expose` marks a message as safe to return verbatim even on a 5xx. Errors
   * from the payment provider are written for merchants and customers and are
   * the whole diagnosis — swallowing them behind "Something went wrong" leaves
   * a failing checkout with nothing to act on.
   */
  constructor(status, message, { expose = false, code = '' } = {}) {
    super(message);
    this.status = status;
    this.expose = expose;
    this.code = code;
  }
}

export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

export function allowMethods(req, methods) {
  if (!methods.includes(req.method)) {
    throw new HttpError(405, 'Method not allowed.');
  }
}

export async function readJson(req) {
  try {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.');
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'The request body must be valid JSON.');
  }
}

export async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function readForm(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  const raw = req.body && typeof req.body === 'string'
    ? req.body
    : (await readRawBody(req)).toString('utf8');
  return Object.fromEntries(new URLSearchParams(raw));
}

export function handleError(res, error) {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  const safe = status < 500 || error.expose;
  return json(res, status, {
    error: safe ? error.message : 'Something went wrong. Please try again.',
    ...(error.code ? { code: error.code } : {}),
  });
}

export function assertSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  const protocol = req.headers['x-forwarded-proto'] || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host || new URL(origin).host !== host || new URL(origin).protocol !== `${protocol}:`) {
    throw new HttpError(403, 'Request origin was not accepted.');
  }
}

export function text(value, maxLength = 500) {
  return String(value ?? '').trim().slice(0, maxLength);
}

export function slug(value) {
  const result = text(value, 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!result) throw new HttpError(400, 'A valid name or ID is required.');
  return result;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const VERCEL_HOST = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.vercel\.app$/i;

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function firstHeaderValue(value) {
  return String(value ?? '').split(',')[0].trim();
}

// The origin Paystack should send a customer back to. Production pins this to
// APP_URL so a customer who arrived on a deployment alias still lands on the
// real shop, while previews and local runs follow the host the request actually
// arrived on — that is what lets a preview verify its own test payments with no
// per-deployment configuration. The allowlist keeps a forged Host header from
// turning a redirect into an off-site link.
export function appUrl(req) {
  const canonical = String(process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (process.env.VERCEL_ENV === 'production' && canonical) return canonical;

  const host = firstHeaderValue(req.headers['x-forwarded-host'] || req.headers.host);
  const forwardedProtocol = firstHeaderValue(req.headers['x-forwarded-proto']);
  const protocol = forwardedProtocol || (LOCAL_HOST.test(host) ? 'http' : 'https');
  const trusted = host && (VERCEL_HOST.test(host) || LOCAL_HOST.test(host) || host === hostOf(canonical));
  if (trusted) return `${protocol}://${host}`;
  if (canonical) return canonical;
  throw new HttpError(503, 'The deployment origin has not been configured yet.');
}
