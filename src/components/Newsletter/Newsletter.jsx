import { useState } from 'react';
import './Newsletter.css';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email.trim()) setSubmitted(true);
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
              />
              <button type="submit" className="newsletter__submit">
                Submit
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
