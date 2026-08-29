import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_CONFIG } from '../../data/siteConfig';
import './Newsletter.css';

const STORAGE_KEY = 'sb_newsletter_email';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Reset the "thank you" state on every page navigation so the form
  // is always available when the user visits a new page.
  useEffect(() => {
    setSubmitted(false);
    setEmail('');
  }, [location.pathname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    try {
      const key = SITE_CONFIG.newsletter?.web3formsKey;
      if (key) {
        await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: key,
            subject: 'New newsletter subscriber — The Stitch Bloom',
            from_name: 'The Stitch Bloom Website',
            email,
            message: `New newsletter subscriber: ${email}`,
          }),
        });
      }
    } catch {
      /* fail silently — form shows success regardless so the user isn't confused */
    }

    try { localStorage.setItem(STORAGE_KEY, email); } catch { /* private mode */ }

    setLoading(false);
    setSubmitted(true);
  };

  return (
    <section className="newsletter" aria-label="Newsletter signup">
      <div className="container">
        <div className="newsletter__inner">
          <div className="newsletter__text">
            <p className="newsletter__label">Stay in the loop</p>
            <p className="newsletter__heading">
              Sign up to receive our promotions and news
            </p>
          </div>

          {submitted ? (
            <p className="newsletter__thanks">
              Thank you for subscribing ✦
            </p>
          ) : (
            <form className="newsletter__form" onSubmit={handleSubmit} noValidate>
              <input
                className="newsletter__input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                aria-label="Email address"
                required
                disabled={loading}
              />
              <button type="submit" className="newsletter__submit" disabled={loading}>
                {loading ? 'Subscribing…' : 'Submit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
