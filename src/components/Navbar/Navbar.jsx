import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const NAV_LINKS = [
  { label: 'Shop',    to: '/shop' },
  { label: 'About',   to: '/about' },
  { label: 'Contact', to: '/contact' },
];

/* Simple bag SVG inline — no extra dependency needed */
function BagIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const cartCount = 0;

  useEffect(() => {
    // Reset scroll state on route change
    setIsScrolled(window.scrollY > 60);
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname]);

  const closeMenu = () => setIsMenuOpen(false);

  // Only transparent on the home page when not scrolled
  const isTransparent = isHomePage && !isScrolled && !isMenuOpen;

  const navClass = [
    'navbar',
    isTransparent ? 'navbar--transparent' : 'navbar--solid',
  ].join(' ');

  return (
    <>
      <nav className={navClass} aria-label="Main navigation">
        <div className="navbar__inner">

          {/* Left: page links */}
          <ul className="navbar__links" role="list">
            {NAV_LINKS.map(({ label, to }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `navbar__link${isActive ? ' navbar__link--active' : ''}`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Centre: brand logo */}
          <Link to="/" className="navbar__logo" onClick={closeMenu}>
            <img
              src="/images/logo.svg"
              alt="The Stitch Bloom"
              className="navbar__logo-image"
            />
            <span className="navbar__logo-text">The Stitch Bloom</span>
          </Link>

          {/* Right: cart + mobile toggle */}
          <div className="navbar__actions">
            <button
              className="navbar__cart-btn"
              aria-label={`Bag${cartCount > 0 ? `, ${cartCount} items` : ''}`}
            >
              <BagIcon className="navbar__cart-icon" />
              {cartCount > 0 && (
                <span className="navbar__cart-count" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              className={`navbar__toggle${isMenuOpen ? ' navbar__toggle--open' : ''}`}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((p) => !p)}
            >
              <span className="navbar__toggle-bar" />
              <span className="navbar__toggle-bar" />
              <span className="navbar__toggle-bar" />
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile full-screen drawer */}
      <nav
        className={`navbar__drawer${isMenuOpen ? ' navbar__drawer--open' : ''}`}
        aria-label="Mobile navigation"
      >
        <NavLink to="/"        end className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`} onClick={closeMenu}>Home</NavLink>
        {NAV_LINKS.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `navbar__link${isActive ? ' navbar__link--active' : ''}`
            }
            onClick={closeMenu}
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
