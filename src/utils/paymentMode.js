// Which Paystack account the storefront is talking to. The publishable key is
// already environment-specific and safe to expose, so its prefix is the single
// source of truth on the client — there is no way for the badge to disagree
// with the account the payment is actually charged against.
const publicKey = String(import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '');

export const paymentMode = publicKey.startsWith('pk_live_') ? 'live' : 'test';
export const isTestPayments = paymentMode === 'test';
