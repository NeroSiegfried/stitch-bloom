import { Link } from 'react-router-dom';
import './Footer.css';

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        {/* Main columns */}
        <div className="footer__inner">
          {/* Brand */}
          <div className="footer__brand">
            <p className="footer__brand-name">The Stitch Bloom</p>
            <p className="footer__brand-tagline">Turning waste into worth</p>
            <p className="footer__brand-description">
              Handcrafted crochet bags from recycled textiles — combining style
              with sustainability while empowering women.
            </p>
            <div className="footer__social-links">
              <a
                href="https://instagram.com/thestitchbloomco"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-link"
              >
                Instagram
              </a>
              <a
                href="https://tiktok.com/@thestitchbloomco"
                target="_blank"
                rel="noopener noreferrer"
                className="footer__social-link"
              >
                TikTok
              </a>
            </div>
          </div>

          {/* Shop links */}
          <div>
            <p className="footer__column-title">Shop</p>
            <ul className="footer__link-list" role="list">
              <li><Link to="/shop" className="footer__link">All Products</Link></li>
              <li><Link to="/shop#najma" className="footer__link">Najma Collection</Link></li>
              <li><Link to="/shop#gadget-sleeves" className="footer__link">Gadget Sleeves</Link></li>
            </ul>
          </div>

          {/* Brand links */}
          <div>
            <p className="footer__column-title">Brand</p>
            <ul className="footer__link-list" role="list">
              <li><Link to="/about" className="footer__link">Our Story</Link></li>
              <li><Link to="/contact" className="footer__link">Contact</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <p className="footer__column-title">Contact</p>

            <div className="footer__contact-item">
              <span className="footer__contact-label">Phone</span>
              <a href="tel:+2348037988580" className="footer__contact-value footer__link">
                +234 803 798 8580
              </a>
            </div>

            <div className="footer__contact-item">
              <span className="footer__contact-label">Email</span>
              <a href="mailto:thestitchbloom@yahoo.com" className="footer__contact-value footer__link">
                thestitchbloom@yahoo.com
              </a>
            </div>

            <div className="footer__contact-item">
              <span className="footer__contact-label">Address</span>
              <address className="footer__contact-value" style={{ fontStyle: 'normal' }}>
                26 Hassan Musa Katsina Street,<br />
                Asokoro, Abuja, Nigeria.
              </address>
            </div>

            <div className="footer__contact-item">
              <span className="footer__contact-label">Delivery</span>
              <span className="footer__contact-value">Pre-made: 1 week</span>
              <span className="footer__contact-value">Custom-made: 2 weeks</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="footer__bottom">
          <p className="footer__copyright">
            &copy; {year} The Stitch Bloom Ltd. All rights reserved.
          </p>
          <p className="footer__reg">
            RC No. 9362599
          </p>
        </div>
      </div>
    </footer>
  );
}
