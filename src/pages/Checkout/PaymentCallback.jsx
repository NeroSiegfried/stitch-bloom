import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiCheck, FiClock, FiX } from 'react-icons/fi';
import TestModeNotice from '../../components/TestModeNotice/TestModeNotice';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/products';
import usePageMeta from '../../hooks/usePageMeta';
import { statusLabel } from '../../utils/orderStatus';
import '../Commerce.css';
import './Checkout.css';

// Paystack recommends verifying when a success webhook has not arrived after
// three minutes. These bounded backoff intervals cover that window without
// hammering either Paystack or our server.
const VERIFY_DELAYS_MS = [2_000, 3_000, 5_000, 10_000, 15_000, 20_000, 30_000, 30_000, 30_000, 30_000];

export default function PaymentCallback() {
  const location = useLocation();
  const { clearCart } = useCart();
  const query = new URLSearchParams(location.search);
  const reference = query.get('reference');
  const redirectStatus = query.get('status');
  const [state, setState] = useState({ status: 'checking', order: null, error: '' });
  usePageMeta({ title: 'Payment Status', description: 'Your Stitch Bloom payment status.', path: '/payment/callback' });

  useEffect(() => {
    if (!reference) {
      setState({ status: 'failed', order: null, error: 'No payment reference was returned.' });
      return;
    }
    const controller = new AbortController();
    let timer;
    let stopped = false;

    const verify = async (attempt = 0) => {
      try {
        const response = await fetch(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, {
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 202 && payload.status === 'pending') {
          if (attempt >= VERIFY_DELAYS_MS.length) {
            setState({ status: 'pending', order: null, error: payload.message || 'Paystack is still processing this payment.' });
            return;
          }
          setState({ status: 'checking', order: null, error: payload.message || '' });
          timer = window.setTimeout(() => verify(attempt + 1), VERIFY_DELAYS_MS[attempt]);
          return;
        }
        if (!response.ok) throw new Error(payload.error || 'Payment could not be confirmed.');
        clearCart();
        setState({ status: 'success', order: payload.order, error: '' });
      } catch (error) {
        if (!stopped && error.name !== 'AbortError') {
          setState({ status: 'failed', order: null, error: error.message });
        }
      }
    };

    verify(redirectStatus === 'pending' ? 0 : 1);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [reference, redirectStatus, clearCart]);

  const isWaiting = ['checking', 'pending'].includes(state.status);
  const Icon = isWaiting ? FiClock : state.status === 'success' ? FiCheck : FiX;
  return (
    <main className="commerce-page payment-result page-enter">
      <section className={`payment-result__card payment-result__card--${state.status}`}>
        <span className="payment-result__icon"><Icon /></span>
        <p className="commerce-eyebrow">{state.status === 'checking' ? 'Confirming payment' : state.status === 'pending' ? 'Payment processing' : state.status === 'success' ? 'Payment received' : 'Payment not confirmed'}</p>
        <h1>{state.status === 'checking' ? 'Just a moment.' : state.status === 'pending' ? 'Still processing.' : state.status === 'success' ? 'Thank you.' : 'Let’s check this.'}</h1>
        {state.status === 'checking' && <p>{state.error || 'We are matching your Paystack transaction to your order.'}</p>}
        {state.status === 'pending' && <p>{state.error} You can safely leave this page; your order history and the owner dashboard will continue checking.</p>}
        {state.status === 'success' && <><p>Your order <strong>{state.order.order_number}</strong> is confirmed.</p><dl><div><dt>Amount paid</dt><dd>{formatPrice('₦', state.order.total)}</dd></div><div><dt>Status</dt><dd>{statusLabel(state.order.status)}</dd></div></dl>{state.order.status === 'paid_after_cancel_review' && <p>This payment arrived after the order was closed and is awaiting owner review.</p>}</>}
        {state.status === 'failed' && <p>{state.error || 'We could not confirm this payment. If you were debited, the owner can locate it with your Paystack reference.'}</p>}
        {reference && <p className="payment-result__reference">Reference · {reference}</p>}
        <TestModeNotice><p>This order was paid with test money and is excluded from the owner dashboard totals.</p></TestModeNotice>
        {state.status !== 'checking' && <div className="payment-result__actions"><Link className="btn btn--primary" to="/account">View your orders</Link><Link className="btn btn--secondary" to="/shop">Back to shop</Link></div>}
      </section>
    </main>
  );
}
