import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { FiLock, FiMapPin, FiShoppingBag } from 'react-icons/fi';
import TestModeNotice from '../../components/TestModeNotice/TestModeNotice';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/products';
import {
  NIGERIAN_STATES,
  DELIVERY_FEES,
  canonicalNigeriaState,
  deliveryFeeForState,
  deliveryLabelForZone,
  deliveryZoneForState,
} from '../../data/delivery';
import { assetUrl } from '../../utils/assetUrl';
import usePageMeta from '../../hooks/usePageMeta';
import { isTestPayments } from '../../utils/paymentMode';
import '../Commerce.css';
import './Checkout.css';

function ArrowDiag() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="2" y1="12" x2="12" y2="2" /><polyline points="4,2 12,2 12,10" /></svg>;
}

function CheckoutForm({ user, items, subtotal }) {
  const inferredState = canonicalNigeriaState(user.state);
  const { clearCart } = useCart();
  const [shipping, setShipping] = useState({
    firstName: user.firstName || '', lastName: user.lastName || '', phone: user.phone || '',
    addressLine1: user.addressLine1 || '', addressLine2: user.addressLine2 || '',
    city: user.city || '', state: inferredState, landmark: user.landmark || '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [testDelivery, setTestDelivery] = useState(false);
  const deliveryZone = testDelivery ? 'test' : deliveryZoneForState(shipping.state);
  const deliveryFee = testDelivery ? DELIVERY_FEES.test : deliveryFeeForState(shipping.state);
  const total = subtotal + deliveryFee;
  const update = (event) => setShipping((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipping,
          testDelivery,
          items: items.map((item) => ({
            productId: item.id,
            quantity: item.qty,
            variantLabel: item.variantLabel || null,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Checkout could not be started.');
      clearCart();
      window.location.assign(payload.authorizationUrl);
    } catch (submitError) {
      setError(submitError.message);
      setBusy(false);
    }
  };

  return (
    <form className="checkout-layout container" onSubmit={submit}>
      <section className="checkout-delivery">
        <div className="commerce-form-heading"><div><p className="commerce-eyebrow">Delivery</p><h2>Where is this going?</h2></div><FiMapPin /></div>
        <div className="commerce-field-row">
          <label className="commerce-field">First name<input name="firstName" value={shipping.firstName} onChange={update} autoComplete="given-name" required /></label>
          <label className="commerce-field">Last name<input name="lastName" value={shipping.lastName} onChange={update} autoComplete="family-name" required /></label>
        </div>
        <label className="commerce-field">Phone number<input name="phone" value={shipping.phone} onChange={update} autoComplete="tel" required /></label>
        <label className="commerce-field">Address line 1<input name="addressLine1" value={shipping.addressLine1} onChange={update} autoComplete="address-line1" required /></label>
        <label className="commerce-field">Address line 2 <span>optional</span><input name="addressLine2" value={shipping.addressLine2} onChange={update} autoComplete="address-line2" /></label>
        <div className="commerce-field-row">
          <label className="commerce-field">City / area<input name="city" value={shipping.city} onChange={update} autoComplete="address-level2" required /></label>
          <label className="commerce-field">State / FCT<select name="state" value={shipping.state} onChange={update} autoComplete="address-level1" required><option value="" disabled>Select state or FCT</option>{NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select></label>
        </div>
        <label className="commerce-field">Nearby landmark <span>optional</span><input name="landmark" value={shipping.landmark} onChange={update} /></label>
        {isTestPayments && <label className="commerce-field">Delivery rate <span>Test deployments only</span><select value={testDelivery ? 'test' : 'standard'} onChange={(event) => setTestDelivery(event.target.value === 'test')}><option value="standard">Standard delivery rate</option><option value="test">Test delivery — {formatPrice('₦', DELIVERY_FEES.test)}</option></select></label>}
      </section>

      <aside className="checkout-summary">
        <div className="commerce-section-head"><div><p className="commerce-eyebrow">Your bag</p><h2>Order summary</h2></div><FiShoppingBag /></div>
        <TestModeNotice />
        <ul className="checkout-items">
          {items.map((item) => {
            const chosen = item.colorVariants?.find((variant) => variant.label === item.variantLabel);
            const image = chosen?.images?.[0] || item.images?.[0];
            return <li key={item.cartKey || item.id}><img src={assetUrl(image)} alt="" /><div><p>{item.name}</p>{item.variantLabel && <small>{item.variantLabel}</small>}<small>Quantity {item.qty}</small></div><strong>{formatPrice('₦', item.price * item.qty)}</strong></li>;
          })}
        </ul>
        <dl className="checkout-totals">
          <div><dt>Subtotal</dt><dd>{formatPrice('₦', subtotal)}</dd></div>
          <div><dt>{deliveryLabelForZone(deliveryZone)}</dt><dd>{shipping.state ? formatPrice('₦', deliveryFee) : 'Select state'}</dd></div>
          <div className="checkout-totals__grand"><dt>Total</dt><dd>{formatPrice('₦', total)}</dd></div>
        </dl>
        <p className="checkout-server-note">Product prices and delivery are checked securely on the server before payment.</p>
        {error && <p className="commerce-alert commerce-alert--error" role="alert">{error}</p>}
        <button className="btn-split btn-split--primary checkout-pay" disabled={busy || !shipping.state}><span className="btn-split__label">{busy ? 'Opening Paystack…' : `Pay ${formatPrice('₦', total)}`}</span><span className="btn-split__icon" aria-hidden="true"><span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span><span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span></span></button>
        <p className="checkout-secure"><FiLock /> Secure payment powered by Paystack</p>
      </aside>
    </form>
  );
}

export default function Checkout() {
  const { user, isLoading } = useAuth();
  const { items, total } = useCart();
  usePageMeta({ title: 'Secure Checkout', description: 'Complete delivery details and pay securely with Paystack.', path: '/checkout' });
  if (isLoading) return <main className="commerce-page"><p className="commerce-loading">Preparing checkout…</p></main>;
  if (!user) return <Navigate to="/account" state={{ from: '/checkout' }} replace />;
  if (!items.length) return <main className="commerce-page checkout-empty"><FiShoppingBag /><p className="commerce-eyebrow">Your bag is empty</p><h1>Choose something worth carrying.</h1><Link className="btn btn--primary" to="/shop">Return to the collection</Link></main>;
  return <main className="checkout-page page-enter"><header className="checkout-header"><div className="container"><p className="commerce-eyebrow">Checkout</p><h1>Delivery &amp; payment.</h1></div></header><section className="checkout-body"><CheckoutForm key={user.id} user={user} items={items} subtotal={total} /></section></main>;
}
