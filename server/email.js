import { HttpError } from './http.js';
import { resolveMx, resolveTxt } from 'node:dns/promises';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const EMAIL_DNS_CACHE_MS = 5 * 60 * 1000;
const EMAIL_DNS_TIMEOUT_MS = 2_000;

let emailDnsCache;

export function authEmailConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim()
    && String(process.env.AUTH_EMAIL_FROM || '').trim());
}

function senderDomain() {
  const from = String(process.env.AUTH_EMAIL_FROM || '').trim();
  const address = from.match(/<([^<>]+)>/)?.[1] || from;
  const at = address.lastIndexOf('@');
  return at > 0 ? address.slice(at + 1).trim().toLowerCase() : '';
}

function withTimeout(promise, milliseconds) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('DNS lookup timed out')), milliseconds);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function resendDnsReady(domain, resolver) {
  try {
    const [dkim, spf, mx] = await withTimeout(Promise.all([
      resolver.resolveTxt(`resend._domainkey.${domain}`),
      resolver.resolveTxt(`send.${domain}`),
      resolver.resolveMx(`send.${domain}`),
    ]), EMAIL_DNS_TIMEOUT_MS);
    const dkimValues = dkim.flat().join(' ');
    const spfValues = spf.flat().join(' ');
    return /\bp\s*=\s*[A-Za-z0-9+/=]+/i.test(dkimValues)
      && /include:amazonses\.com/i.test(spfValues)
      && mx.some(({ exchange }) => /amazonses\.com\.?$/i.test(exchange));
  } catch {
    return false;
  }
}

export async function authEmailReady({
  resolver = { resolveMx, resolveTxt },
  now = Date.now(),
  bypassCache = false,
} = {}) {
  if (!authEmailConfigured()) return false;
  const domain = senderDomain();
  if (!domain) return false;
  const fingerprint = `${String(process.env.RESEND_API_KEY).trim()}:${domain}`;
  if (!bypassCache && emailDnsCache?.fingerprint === fingerprint
      && now - emailDnsCache.checkedAt < EMAIL_DNS_CACHE_MS) {
    return emailDnsCache.ready;
  }
  const ready = await resendDnsReady(domain, resolver);
  emailDnsCache = { fingerprint, checkedAt: now, ready };
  return ready;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendEmail({ to, subject, text, html, idempotencyKey }) {
  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.AUTH_EMAIL_FROM || '').trim();
  if (!apiKey || !from) {
    throw new HttpError(503, 'Account email is temporarily unavailable.', {
      expose: true,
      code: 'AUTH_EMAIL_NOT_CONFIGURED',
    });
  }

  let response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      signal: AbortSignal.timeout(6_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [to], subject, text, html }),
    });
  } catch (error) {
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError';
    throw new HttpError(502, timedOut
      ? 'The account email took too long to send. Please try again.'
      : 'The account email could not be sent. Please try again.', {
      expose: true,
      code: timedOut ? 'AUTH_EMAIL_TIMEOUT' : 'AUTH_EMAIL_UNAVAILABLE',
    });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id) {
    console.error(`Resend email failed: HTTP ${response.status} — ${payload?.message || 'unknown response'}`);
    throw new HttpError(502, 'The account email could not be sent. Please try again.', {
      expose: true,
      code: 'AUTH_EMAIL_UNAVAILABLE',
    });
  }
  return payload.id;
}

const COPY = {
  email_verification: {
    subject: 'Confirm your Stitch Bloom account',
    heading: 'Confirm your email address',
    intro: 'Use this one-time code to finish creating your Stitch Bloom account:',
  },
  password_reset: {
    subject: 'Reset your Stitch Bloom password',
    heading: 'Reset your password',
    intro: 'Use this one-time code to choose a new password:',
  },
};

export function sendAuthCode({ to, code, purpose, idempotencyKey }) {
  const copy = COPY[purpose];
  if (!copy) throw new HttpError(500, 'Unknown authentication email purpose.');
  const safeCode = escapeHtml(code);
  return sendEmail({
    to,
    subject: copy.subject,
    idempotencyKey,
    text: `${copy.heading}\n\n${copy.intro}\n\n${code}\n\nThis code expires in 10 minutes. If you did not request it, you can ignore this email.`,
    html: `<div style="font-family:Arial,sans-serif;color:#2f211b;line-height:1.6;max-width:520px;margin:auto"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase">The Stitch Bloom</p><h1 style="font-size:26px;font-weight:400">${escapeHtml(copy.heading)}</h1><p>${escapeHtml(copy.intro)}</p><p style="font-size:32px;letter-spacing:.22em;font-weight:600">${safeCode}</p><p style="color:#6f625b">This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>`,
  });
}

export async function sendPasswordChanged({ to }) {
  if (!authEmailConfigured()) return;
  await sendEmail({
    to,
    subject: 'Your Stitch Bloom password was changed',
    text: 'Your Stitch Bloom password was changed. If this was not you, contact us immediately.',
    html: '<div style="font-family:Arial,sans-serif;color:#2f211b;line-height:1.6;max-width:520px;margin:auto"><p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase">The Stitch Bloom</p><h1 style="font-size:26px;font-weight:400">Password changed</h1><p>Your Stitch Bloom password was changed. If this was not you, contact us immediately.</p></div>',
  });
}
