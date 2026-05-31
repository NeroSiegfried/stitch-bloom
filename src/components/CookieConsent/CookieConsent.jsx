import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './CookieConsent.css';

const CONSENT_KEY = 'sb_cookie_consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CONSENT_KEY)) {
        /* Small delay so the banner doesn't flash on page load before hydration */
        const t = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(t);
      }
    } catch {
      /* private/restricted mode — don't show */
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch { /* noop */ }
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch { /* noop */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-consent" role="dialog" aria-label="Cookie preferences" aria-live="polite">
      <div className="cookie-consent__inner">
        <div className="cookie-consent__text">
          <p className="cookie-consent__heading">We use cookies</p>
          <p className="cookie-consent__body">
            We use small pieces of data stored in your browser to remember your cart and improve your experience.
            No tracking or advertising cookies are used.{' '}
            <Link to="/about" className="cookie-consent__link" onClick={decline}>
              Learn more
            </Link>
          </p>
        </div>
        <div className="cookie-consent__actions">
          <button className="cookie-consent__btn cookie-consent__btn--accept" onClick={accept}>
            Accept
          </button>
          <button className="cookie-consent__btn cookie-consent__btn--decline" onClick={decline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
