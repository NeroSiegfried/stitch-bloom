import { useState } from 'react';
import { FiInstagram } from 'react-icons/fi';
import { SITE_CONFIG } from '../../data/siteConfig';
import '../../styles/buttons.css';
import './Contact.css';

/* ── Diagonal arrow ── */
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

const ENQUIRY_TOPICS = [
  'General Enquiry',
  'Product Information',
  'Place a Custom Order',
  'Wholesale / Partnership',
  'Delivery & Shipping',
  'Other',
];

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: '',
    message: '',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = encodeURIComponent(`[${formData.topic || 'Enquiry'}] from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\n${formData.message}`
    );
    window.location.href = `mailto:${SITE_CONFIG.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <main className="page-enter">
      {/* ── Page header ── */}
      <header className="contact-header">
        <div className="container">
          <p className="contact-header__eyebrow">Get in touch</p>
          <h1 className="contact-header__title">Contact Us</h1>
          <p className="contact-header__subtitle">
            We'd love to hear from you — whether you have a question, want to
            place a custom order, or just want to say hello.
          </p>
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div className="contact-body">
        <div className="contact-body__inner">
          {/* ── Form panel ── */}
          <div className="contact-form-panel">
            <div className="contact-form-panel__inner">
            {submitted ? (
              <div className="contact-form__success">
                <p className="contact-form__success-eyebrow">Message sent</p>
                <h2 className="contact-form__success-title">Thank you for reaching out.</h2>
                <p className="contact-form__success-body">
                  Your email client should have opened. We aim to respond
                  within one business day.
                </p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleSubmit} noValidate>
                <h2 className="contact-form__heading">Send us a message</h2>

                <div className="contact-form__row">
                  <div className="contact-form__field">
                    <label className="contact-form__label" htmlFor="cf-name">Name</label>
                    <input
                      id="cf-name"
                      className="contact-form__input"
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  <div className="contact-form__field">
                    <label className="contact-form__label" htmlFor="cf-email">Email</label>
                    <input
                      id="cf-email"
                      className="contact-form__input"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="contact-form__row">
                  <div className="contact-form__field">
                    <label className="contact-form__label" htmlFor="cf-phone">Phone (optional)</label>
                    <input
                      id="cf-phone"
                      className="contact-form__input"
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+234 ..."
                    />
                  </div>
                  <div className="contact-form__field">
                    <label className="contact-form__label" htmlFor="cf-topic">Topic</label>
                    <select
                      id="cf-topic"
                      className="contact-form__input contact-form__select"
                      name="topic"
                      value={formData.topic}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>Select a topic…</option>
                      {ENQUIRY_TOPICS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="contact-form__field">
                  <label className="contact-form__label" htmlFor="cf-message">Message</label>
                  <textarea
                    id="cf-message"
                    className="contact-form__input contact-form__textarea"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more…"
                    rows={5}
                    required
                  />
                </div>

                <button type="submit" className="btn-split btn-split--primary contact-form__submit">
                  <span className="btn-split__label">Send Message</span>
                  <span className="btn-split__icon" aria-hidden="true">
                    <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
                    <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
                  </span>
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Info panel ── */}
        <div className="contact-info-panel">
          <div className="contact-info-panel__inner">
            <h2 className="contact-info__heading">How to reach us</h2>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Email</span>
              <address className="contact-info-item__value">
                <a href={`mailto:${SITE_CONFIG.email}`}>{SITE_CONFIG.email}</a>
              </address>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Phone / WhatsApp</span>
              <address className="contact-info-item__value">
                <a href={`tel:${SITE_CONFIG.phone}`}>{SITE_CONFIG.phoneFormatted}</a>
              </address>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Address</span>
              <address className="contact-info-item__value">
                {SITE_CONFIG.address.line1}<br />
                {SITE_CONFIG.address.line2}
              </address>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Founder</span>
              <p className="contact-info-item__value">{SITE_CONFIG.founder}</p>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Delivery windows</span>
              <p className="contact-info-item__value">
                Pre-made orders: <strong>{SITE_CONFIG.deliveryWindows.premade}</strong><br />
                Custom orders: <strong>{SITE_CONFIG.deliveryWindows.custom}</strong>
              </p>
            </div>

            <div className="contact-info-item">
              <span className="contact-info-item__label">Follow us</span>
              <div className="contact-info-social">
                <a
                  href={SITE_CONFIG.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="contact-info-social__link"
                  aria-label="Follow us on Instagram"
                >
                  <FiInstagram size={14} />
                  @{SITE_CONFIG.instagram.handle}
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>{/* /.contact-body__inner */}
      </div>
    </main>
  );
}
