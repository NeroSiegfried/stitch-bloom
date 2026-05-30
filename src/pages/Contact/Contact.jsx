import { useState } from 'react';
import '../../styles/buttons.css';
import './Contact.css';

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
    /* The form is wired to mailto so it opens the email client.
       Mark as submitted for UI feedback. */
    const subject = encodeURIComponent(`[${formData.topic || 'Enquiry'}] from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\n\n${formData.message}`
    );
    window.location.href = `mailto:thestitchbloom@yahoo.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
  };

  return (
    <main className="page-enter">
      {/* ── Page header ── */}
      <header className="contact-header">
        <p className="contact-header__eyebrow">Get in touch</p>
        <h1 className="contact-header__title">Contact Us</h1>
        <p className="contact-header__subtitle">
          We'd love to hear from you — whether you have a question, want to
          place a custom order, or just want to say hello.
        </p>
      </header>

      {/* ── Contact body ── */}
      <section className="section contact-body" aria-label="Contact information and form">
        <div className="container">
          <div className="contact-body__layout">
            {/* Details panel */}
            <div className="contact-details">
              <h2 className="contact-details__title">How to reach us</h2>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Email</span>
                <address className="contact-detail-item__value">
                  <a href="mailto:thestitchbloom@yahoo.com">
                    thestitchbloom@yahoo.com
                  </a>
                </address>
              </div>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Phone / WhatsApp</span>
                <address className="contact-detail-item__value">
                  <a href="tel:+2348037988580">+234 803 798 8580</a>
                </address>
              </div>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Address</span>
                <address className="contact-detail-item__value">
                  26 Hassan Musa Katsina Street,<br />
                  Asokoro, Abuja, Nigeria.
                </address>
              </div>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Founder</span>
                <p className="contact-detail-item__value">Whebuma Maigari</p>
              </div>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Delivery windows</span>
                <p className="contact-detail-item__value">
                  Pre-made orders: <strong>1 week</strong><br />
                  Custom orders: <strong>2 weeks</strong>
                </p>
              </div>

              <div className="contact-detail-item">
                <span className="contact-detail-item__label">Follow us</span>
                <div className="contact-social">
                  <a
                    href="https://instagram.com/thestitchbloomco"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social__link"
                    aria-label="Follow us on Instagram"
                  >
                    📸 Instagram
                  </a>
                  <a
                    href="https://tiktok.com/@thestitchbloomco"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-social__link"
                    aria-label="Follow us on TikTok"
                  >
                    🎵 TikTok
                  </a>
                </div>
              </div>
            </div>

            {/* Enquiry form */}
            <div className="contact-form">
              {submitted ? (
                <div className="contact-form__success">
                  <div className="contact-form__success-icon" aria-hidden="true">✉️</div>
                  <h3 className="contact-form__success-title">Message sent!</h3>
                  <p className="contact-form__success-body">
                    Your email client has been opened with your message. We'll
                    get back to you as soon as possible.
                  </p>
                  <button
                    className="btn btn--secondary"
                    style={{ marginTop: 'var(--space-md)' }}
                    onClick={() => setSubmitted(false)}
                  >
                    Send another
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="contact-form__title">Send an enquiry</h2>
                  <form
                    className="contact-form__fields"
                    onSubmit={handleSubmit}
                    noValidate
                  >
                    <div className="form-field">
                      <label className="form-field__label" htmlFor="name">
                        Full name <span aria-hidden="true">*</span>
                      </label>
                      <input
                        className="form-field__input"
                        id="name"
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Your name"
                        required
                        autoComplete="name"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-field__label" htmlFor="email">
                        Email address <span aria-hidden="true">*</span>
                      </label>
                      <input
                        className="form-field__input"
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-field__label" htmlFor="phone">
                        Phone / WhatsApp
                      </label>
                      <input
                        className="form-field__input"
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+234 …"
                        autoComplete="tel"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-field__label" htmlFor="topic">
                        Topic
                      </label>
                      <select
                        className="form-field__select"
                        id="topic"
                        name="topic"
                        value={formData.topic}
                        onChange={handleChange}
                      >
                        <option value="">Select a topic…</option>
                        {ENQUIRY_TOPICS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-field__label" htmlFor="message">
                        Message <span aria-hidden="true">*</span>
                      </label>
                      <textarea
                        className="form-field__textarea"
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us what you're looking for…"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn--primary contact-form__submit"
                    >
                      Send Message
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Location ── */}
      <section className="section contact-location" aria-label="Our location">
        <div className="container">
          <div className="contact-location__inner">
            <div className="contact-location__map">
              <iframe
                title="The Stitch Bloom location"
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.233!2d7.5248!3d9.0579!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sAsokoro%2C+Abuja!5e0!3m2!1sen!2sng!4v1"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                aria-hidden="true"
              />
            </div>

            <div className="contact-location__text">
              <h2 className="contact-location__title">Find us in Abuja</h2>
              <address className="contact-location__address">
                26 Hassan Musa Katsina Street,<br />
                Asokoro, Abuja, Nigeria.
              </address>
              <a
                href="https://maps.google.com/?q=Asokoro,+Abuja,+Nigeria"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn--secondary"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
