import { useAuth } from '../../context/AuthContext';
import './TestModeNotice.css';

// Renders nothing on the live storefront, so the same build is safe to promote
// from a preview to production without stripping anything out.
export default function TestModeNotice({ children }) {
  const { authCapabilities } = useAuth();
  if (authCapabilities.paymentMode !== 'test') return null;
  return (
    <aside className="test-mode-notice">
      <p><strong>Test mode</strong> — this deployment uses Paystack test keys. No real money moves.</p>
      {children || <p>Pay with card <code>4084 0840 8408 4081</code>, any future expiry, CVV <code>408</code>, PIN <code>0000</code>, OTP <code>123456</code>.</p>}
    </aside>
  );
}
