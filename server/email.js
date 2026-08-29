import { HttpError } from './http.js';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function authEmailConfigured() {
  return Boolean(String(process.env.RESEND_API_KEY || '').trim()
    && String(process.env.AUTH_EMAIL_FROM || '').trim());
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
    throw new HttpError(503, 'Email verification is temporarily unavailable.', {
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
      ? 'The verification email took too long to send. Please try again.'
      : 'The verification email could not be sent. Please try again.', {
      expose: true,
      code: timedOut ? 'AUTH_EMAIL_TIMEOUT' : 'AUTH_EMAIL_UNAVAILABLE',
    });
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.id) {
    console.error(`Resend email failed: HTTP ${response.status} — ${payload?.message || 'unknown response'}`);
    throw new HttpError(502, 'The verification email could not be sent. Please try again.', {
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
