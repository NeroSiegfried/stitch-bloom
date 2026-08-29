import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiPackage, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/products';
import { assetUrl } from '../../utils/assetUrl';
import usePageMeta from '../../hooks/usePageMeta';
import '../../styles/buttons.css';
import '../Commerce.css';
import './Account.css';
import SmartImage from '../../components/SmartImage/SmartImage';
import { useCatalog } from '../../context/CatalogContext';
import { siteAsset } from '../../utils/siteAssets';
import { statusLabel } from '../../utils/orderStatus';
import { NIGERIAN_STATES, canonicalNigeriaState, deliveryLabelForZone } from '../../data/delivery';

function ArrowDiag() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="2" y1="12" x2="12" y2="2" />
      <polyline points="4,2 12,2 12,10" />
    </svg>
  );
}

function SplitArrowButton({ children, busy, className = '' }) {
  return (
    <button type="submit" className={`btn-split btn-split--primary ${className}`.trim()} disabled={busy}>
      <span className="btn-split__label">{children}</span>
      <span className="btn-split__icon" aria-hidden="true">
        <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
        <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
      </span>
    </button>
  );
}

function AuthForm({ mode, onModeChange }) {
  const { siteAssets } = useCatalog();
  const {
    authCapabilities,
    signIn,
    signUp,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const oauthResult = new URLSearchParams(location.search).get('auth');
  const [fields, setFields] = useState({
    firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '', code: '',
  });
  const [error, setError] = useState(() => oauthResult === 'oauth-error'
    ? 'Social sign-in could not be completed. Please try again.'
    : '');
  const [message, setMessage] = useState(() => {
    if (oauthResult === 'oauth-cancelled') return 'Social sign-in was cancelled.';
    return '';
  });
  const [busy, setBusy] = useState(false);

  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));
  const changeMode = (nextMode) => {
    setError('');
    setMessage('');
    setFields((current) => ({ ...current, password: '', confirmPassword: '', code: '' }));
    onModeChange(nextMode);
  };
  const finishSignIn = (user) => {
    const destination = location.state?.from || (user.role === 'admin' ? '/admin' : '/account');
    navigate(destination, { replace: true });
  };
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signin') {
        finishSignIn(await signIn(fields));
      } else if (mode === 'signup') {
        const payload = await signUp(fields);
        if (payload.verificationRequired) {
          setMessage(payload.message);
          onModeChange('verify');
        } else {
          finishSignIn(payload.user);
        }
      } else if (mode === 'verify') {
        finishSignIn(await verifyEmail(fields));
      } else if (mode === 'forgot') {
        const payload = await requestPasswordReset(fields);
        setMessage(payload.message);
        onModeChange('reset');
      } else if (mode === 'reset') {
        const payload = await resetPassword(fields);
        setFields((current) => ({ ...current, password: '', confirmPassword: '', code: '' }));
        setMessage(payload.message);
        onModeChange('signin');
      }
    } catch (submitError) {
      if (submitError.code === 'EMAIL_VERIFICATION_REQUIRED') {
        setMessage(submitError.message);
        onModeChange('verify');
        return;
      }
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setBusy(true); setError(''); setMessage('');
    try {
      const payload = await resendVerification({ email: fields.email });
      setMessage(payload.message);
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setBusy(false);
    }
  };

  const isSignIn = mode === 'signin';
  const isSignUp = mode === 'signup';
  const copy = {
    signin: ['Welcome back.', 'Sign in to view your orders and saved delivery details.'],
    signup: ['Create your account.', 'Save your delivery details and keep track of each order.'],
    verify: ['Check your email.', 'Enter the six-digit code we sent to confirm your address.'],
    forgot: ['Reset your password.', 'Enter your email and we’ll send a short confirmation code.'],
    reset: ['Choose a new password.', 'Enter the code from your email, then choose a new password.'],
  }[mode];
  const submitLabel = {
    signin: 'Sign in', signup: 'Create account', verify: 'Confirm email',
    forgot: 'Send reset code', reset: 'Update password',
  }[mode];
  const showOauth = authCapabilities.oauth.google || authCapabilities.oauth.apple;

  return (
    <section className="account-access" aria-label={copy[0]}>
      <div className="container account-access__layout">
        <div className="account-access__image-wrap">
          <SmartImage src={siteAsset(siteAssets, 'account-hero')} context="card" alt="A Stitch Bloom clutch held by its maker" />
        </div>

        <div className="account-auth-card">
          {/* Constrains the measure once the card goes full-width, so the
              fields stay readable instead of stretching edge to edge. */}
          <div className="account-auth-card__inner">
          <header className="account-auth-card__heading">
            <p className="commerce-eyebrow">Your account</p>
            <h1>{copy[0]}</h1>
            <p>{copy[1]}</p>
          </header>

          <form className="account-auth-form" onSubmit={submit}>
            {isSignUp && <label className="commerce-field">First name<input name="firstName" value={fields.firstName} onChange={update} autoComplete="given-name" required /></label>}
            {isSignUp && <label className="commerce-field">Last name<input name="lastName" value={fields.lastName} onChange={update} autoComplete="family-name" required /></label>}
            <label className="commerce-field">Email address<input type="email" name="email" value={fields.email} onChange={update} autoComplete="email" required /></label>
            {['verify', 'reset'].includes(mode) && <label className="commerce-field">Six-digit code<input name="code" value={fields.code} onChange={update} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" required /></label>}
            {['signin', 'signup', 'reset'].includes(mode) && <label className="commerce-field">{mode === 'reset' ? 'New password' : 'Password'}<input type="password" name="password" value={fields.password} onChange={update} autoComplete={isSignIn ? 'current-password' : 'new-password'} minLength="8" maxLength="128" required /></label>}
            {mode === 'reset' && <label className="commerce-field">Confirm new password<input type="password" name="confirmPassword" value={fields.confirmPassword} onChange={update} autoComplete="new-password" minLength="8" maxLength="128" required /></label>}
            {isSignUp && <label className="commerce-field">Phone number <span>optional until checkout</span><input name="phone" value={fields.phone} onChange={update} autoComplete="tel" /></label>}

            {error && <p className="commerce-alert commerce-alert--error" role="alert">{error}</p>}
            {message && <p className="commerce-alert commerce-alert--success" role="status">{message}</p>}
            <SplitArrowButton busy={busy} className="account-auth-form__submit">
              {busy ? 'Please wait…' : submitLabel}
            </SplitArrowButton>

            {showOauth && <div className="account-auth-form__oauth" aria-label="Other ways to sign in">
              {authCapabilities.oauth.google && <a className="btn btn--primary" href="/api/auth/google">Continue with Google</a>}
              {authCapabilities.oauth.apple && <a className="btn btn--primary" href="/api/auth/apple">Continue with Apple</a>}
            </div>}

            <p className="account-auth-form__privacy">Your delivery information is used only to fulfil your orders.</p>
            <p className="account-auth-form__switch">
              {isSignIn && <>{authCapabilities.passwordRecovery && <>Forgot your password? <button type="button" onClick={() => changeMode('forgot')}>Reset it</button>. </>}New to The Stitch Bloom? <button type="button" onClick={() => changeMode('signup')}>Create an account</button></>}
              {isSignUp && <>Already have an account? <button type="button" onClick={() => changeMode('signin')}>Sign in instead</button></>}
              {mode === 'verify' && <>Didn’t receive it? <button type="button" disabled={busy} onClick={resend}>Send another code</button>. Wrong email? <button type="button" onClick={() => changeMode('signup')}>Start again</button></>}
              {['forgot', 'reset'].includes(mode) && <>Remember your password? <button type="button" onClick={() => changeMode('signin')}>Sign in</button></>}
            </p>
          </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProfileForm({ user }) {
  const { updateProfile } = useAuth();
  const [fields, setFields] = useState(() => ({
    ...user,
    state: canonicalNigeriaState(user.state),
  }));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const update = (event) => setFields((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setMessage(''); setError('');
    try {
      await updateProfile(fields);
      setMessage('Delivery details saved.');
    } catch (submitError) {
      setError(submitError.message);
    } finally { setBusy(false); }
  };

  return (
    <form className="account-details" onSubmit={submit}>
      <div className="commerce-form-heading"><div><p className="commerce-eyebrow">Delivery profile</p><h2>Where should we send it?</h2></div><FiUser /></div>
      <div className="commerce-field-row">
        <label className="commerce-field">First name<input name="firstName" value={fields.firstName || ''} onChange={update} required /></label>
        <label className="commerce-field">Last name<input name="lastName" value={fields.lastName || ''} onChange={update} required /></label>
      </div>
      <label className="commerce-field">Phone number<input name="phone" value={fields.phone || ''} onChange={update} required /></label>
      <label className="commerce-field">Address line 1<input name="addressLine1" value={fields.addressLine1 || ''} onChange={update} /></label>
      <label className="commerce-field">Address line 2 <span>optional</span><input name="addressLine2" value={fields.addressLine2 || ''} onChange={update} /></label>
      <div className="commerce-field-row">
        <label className="commerce-field">City / area<input name="city" value={fields.city || ''} onChange={update} /></label>
        <label className="commerce-field">State / FCT<select name="state" value={fields.state || ''} onChange={update}><option value="" disabled>Select state or FCT</option>{NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
      </div>
      <label className="commerce-field">Nearby landmark <span>optional</span><input name="landmark" value={fields.landmark || ''} onChange={update} /></label>
      {message && <p className="commerce-alert commerce-alert--success">{message}</p>}
      {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
      <SplitArrowButton busy={busy} className="account-profile-submit">{busy ? 'Saving…' : 'Save delivery details'}</SplitArrowButton>
    </form>
  );
}

function OrderHistory() {
  const { clearCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [busyAction, setBusyAction] = useState('');

  const loadOrders = useCallback(() => {
    setError('');
    return fetch('/api/orders').then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setOrders(payload.orders || []);
    }).catch((fetchError) => setError(fetchError.message));
  }, []);
  const reconcileOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reconcile_pending' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (response.ok && payload.checked > 0) await loadOrders();
    } catch (reconcileError) {
      console.error(`Payment reconciliation failed: ${reconcileError.message}`);
    }
  }, [loadOrders]);
  useEffect(() => {
    loadOrders().finally(reconcileOrders);
  }, [loadOrders, reconcileOrders]);
  useEffect(() => {
    const refreshVisibleOrders = () => {
      if (document.visibilityState === 'visible') {
        loadOrders().finally(reconcileOrders);
      }
    };
    window.addEventListener('focus', refreshVisibleOrders);
    document.addEventListener('visibilitychange', refreshVisibleOrders);
    return () => {
      window.removeEventListener('focus', refreshVisibleOrders);
      document.removeEventListener('visibilitychange', refreshVisibleOrders);
    };
  }, [loadOrders, reconcileOrders]);

  const actOnOrder = async (order, action) => {
    if (action === 'cancel' && !window.confirm(`Cancel ${order.order_number}?`)) return;
    setBusyAction(`${order.id}:${action}`);
    setError('');
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: order.id, action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The order could not be updated.');
      if (action === 'retry') {
        clearCart();
        window.location.assign(payload.authorizationUrl);
        return;
      }
      await loadOrders();
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyAction('');
    }
  };

  return (
    <section className="account-orders">
      <div className="commerce-section-head"><div><p className="commerce-eyebrow">Order history</p><h2>Your pieces</h2></div><FiPackage /></div>
      {error && <p className="commerce-alert commerce-alert--error">{error}</p>}
      {!error && orders.length === 0 && <p className="commerce-empty">Your first order will appear here once checkout begins.</p>}
      <div className="commerce-order-list">
        {orders.map((order) => {
          const canManagePayment = !['paid', 'refund_pending', 'refunded'].includes(order.payment_status)
            && !['cancelled', 'delivered'].includes(order.status);
          const latestAttempt = order.paymentAttempts?.[0];
          return (
            <details className="commerce-order" key={order.id}>
              <summary className="commerce-order__head">
                <div><p>{order.order_number}</p><time>{new Date(order.created_at).toLocaleDateString('en-NG', { dateStyle: 'medium' })}</time></div>
                <div className="commerce-order__summary-meta"><span data-order-status={order.status}>Order: {statusLabel(order.status)}</span><span data-payment-status={order.payment_status}>Payment: {statusLabel(order.payment_status)}</span><strong>{formatPrice('₦', order.total)}</strong></div>
              </summary>
              <div className="commerce-order__details">
                <ul className="commerce-order__items">
                  {order.items.map((item) => (
                    <li key={`${order.id}-${item.product_name}-${item.variant_label || ''}`}>
                      <div className="commerce-order__thumb">{item.image_url && <img src={assetUrl(item.image_url)} alt="" />}</div>
                      <div><strong>{item.product_name}</strong><span>{item.variant_label || 'Standard'} · Qty {item.quantity}</span></div>
                      <strong>{formatPrice('₦', item.line_total)}</strong>
                    </li>
                  ))}
                </ul>
                <div className="commerce-order__facts">
                  <div>
                    <p className="commerce-eyebrow">Delivery</p>
                    <address>{order.customer_name}<br />{order.address_line1}{order.address_line2 ? <><br />{order.address_line2}</> : null}<br />{order.city}, {order.state}<br />{order.phone}</address>
                  </div>
                  <dl>
                    <div><dt>Subtotal</dt><dd>{formatPrice('₦', order.subtotal)}</dd></div>
                    <div><dt>{deliveryLabelForZone(order.delivery_zone)}</dt><dd>{formatPrice('₦', order.delivery_fee)}</dd></div>
                    <div><dt>Total</dt><dd>{formatPrice('₦', order.total)}</dd></div>
                  </dl>
                </div>
                <div className="commerce-order__payment-note">
                  <span>Order: {statusLabel(order.status)}</span>
                  <span>Payment: {statusLabel(order.payment_status)}</span>
                  {latestAttempt && <span>Gateway attempt: {statusLabel(latestAttempt.status)}</span>}
                  {latestAttempt && <span>Local attempt: {statusLabel(latestAttempt.local_status)}</span>}
                  {order.paystack_reference && <span>Reference: {order.paystack_reference}</span>}
                  {order.payment_gateway_response && <span>{order.payment_gateway_response}</span>}
                </div>
                {canManagePayment && (
                  <div className="commerce-order__actions">
                    <button className="btn btn--primary" disabled={Boolean(busyAction)} onClick={() => actOnOrder(order, 'retry')}>
                      {busyAction === `${order.id}:retry` ? 'Opening Paystack…' : 'Retry payment'}
                    </button>
                    <button className="commerce-order__cancel" disabled={Boolean(busyAction)} onClick={() => actOnOrder(order, 'cancel')}>Cancel order</button>
                  </div>
                )}
                {order.status === 'cancelled' && <p className="commerce-order__state-note">This order is cancelled locally and will not be fulfilled. If the payment provider later confirms a charge, it will be held for owner review.</p>}
                {order.status === 'payment_expired' && <p className="commerce-order__state-note">The payment window expired without a confirmed charge. You can retry with a new payment attempt.</p>}
                {order.status === 'paid_after_cancel_review' && <p className="commerce-alert commerce-alert--warning commerce-order__review">A payment arrived after this order was closed. The owner must either accept the order or refund the payment before fulfilment.</p>}
                {order.payment_status === 'refund_pending' && <p className="commerce-order__refund">Your refund has been started and is being processed by Paystack.</p>}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

export default function Account() {
  const { user, isLoading, signOut } = useAuth();
  const [mode, setMode] = useState('signin');
  usePageMeta({ title: 'Your Account', description: 'Manage your Stitch Bloom delivery details and orders.', path: '/account' });

  if (isLoading) return <main className="account-page"><p className="commerce-loading">Opening your account…</p></main>;
  if (!user) return <main className="account-page page-enter"><AuthForm mode={mode} onModeChange={setMode} /></main>;

  return (
    <main className="account-page page-enter">
      <header className="account-profile-header">
        <div className="container account-profile-header__inner">
          <div><p className="account-profile-header__eyebrow">Signed in as {user.email}</p><h1>Hello, {user.firstName}.</h1></div>
          <div className="commerce-head-actions">
            {user.role === 'admin' && <Link className="btn-split btn-split--light" to="/admin"><span className="btn-split__label">Owner dashboard</span><span className="btn-split__icon" aria-hidden="true"><span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span><span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span></span></Link>}
            <button className="btn btn--light-outline" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <section className="account-body">
        <div className="container account-layout">
          <ProfileForm key={user.id} user={user} />
          <OrderHistory />
        </div>
      </section>
    </main>
  );
}
