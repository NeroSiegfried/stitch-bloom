import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { FiShoppingBag, FiSearch, FiX } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { getAllProducts } from '../../data/products';
import { assetUrl } from '../../utils/assetUrl';
import './Navbar.css';

const SHOP_LINKS = [
  { label: 'Shop All',         to: '/shop' },
  { label: 'Najma Collection', to: '/shop#najma' },
  { label: 'Gadget Sleeves',   to: '/shop#gadget-sleeves' },
  { label: 'Accessories',      to: '/shop#accessories' },
];

const BRAND_LINKS = [
  { label: 'About',   to: '/about' },
  { label: 'Contact', to: '/contact' },
];

function HamburgerIcon() {
  return (
    <svg width="18" height="13" viewBox="0 0 18 13" fill="none" aria-hidden="true">
      <line x1="0" y1="0.75"  x2="18" y2="0.75"  stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="6.5"   x2="18" y2="6.5"   stroke="currentColor" strokeWidth="1.5"/>
      <line x1="0" y1="12.25" x2="18" y2="12.25" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef(null);
  const location = useLocation();
  const { count, setIsOpen: openCart } = useCart();

  const allProducts = getAllProducts();
  const searchResults = query.trim().length > 1
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.collectionName?.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  useEffect(() => setIsMenuOpen(false), [location.pathname]);
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMenuOpen]);

  const close = () => setIsMenuOpen(false);
  const closeSearch = () => setSearchOpen(false);

  return (
    <>
      <div
        className={`navbar__backdrop${isMenuOpen ? ' navbar__backdrop--open' : ''}`}
        onClick={close}
        aria-hidden="true"
      />

      <nav className="navbar" aria-label="Main navigation">
        <div className="navbar__inner">

        <button
          className={`navbar__cell navbar__menu-cell${isMenuOpen ? ' navbar__menu-cell--open' : ''}`}
          onClick={() => { setIsMenuOpen(p => !p); setSearchOpen(false); }}
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {isMenuOpen ? <FiX size={18} aria-hidden="true" /> : <HamburgerIcon />}
          <span className="navbar__menu-label">{isMenuOpen ? 'Close' : 'Menu'}</span>
        </button>

        <Link to="/" className="navbar__cell navbar__logo-cell" onClick={close} aria-label="The Stitch Bloom">
          {/* Small screen SVG logo */}
          <img
            src={assetUrl('/images/logo.svg')}
            alt="The Stitch Bloom"
            className="navbar__logo-img"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          {/* Large screen typography logo */}
          <div className="navbar__logo-text-wrapper">
            <span className="navbar__logo-the">The</span>
            <span className="navbar__logo-bloom">Stitch Bloom</span>
          </div>
        </Link>

        <button
          className={`navbar__cell navbar__search-cell${searchOpen ? ' navbar__search-cell--open' : ''}`}
          onClick={() => { setSearchOpen(p => !p); setIsMenuOpen(false); }}
          aria-label={searchOpen ? 'Close search' : 'Search products'}
          aria-expanded={searchOpen}
        >
          {searchOpen ? <FiX size={18} aria-hidden="true" /> : <FiSearch size={18} aria-hidden="true" />}
        </button>

        <button
          className="navbar__cell navbar__cart-cell"
          onClick={() => openCart(true)}
          aria-label={`Bag${count > 0 ? `, ${count} item${count !== 1 ? 's' : ''}` : ''}`}
        >
          <FiShoppingBag size={18} aria-hidden="true" />
          {count > 0 && (
            <span className="navbar__cart-count" aria-hidden="true">{count}</span>
          )}
        </button>

        </div>{/* /.navbar__inner */}
      </nav>

      <div
        className={`navbar__panel${isMenuOpen ? ' navbar__panel--open' : ''}`}
        role="dialog"
        aria-label="Navigation menu"
        aria-hidden={!isMenuOpen}
      >
        <div className="navbar__panel-inner">

          <div className="navbar__panel-section">
            <p className="navbar__panel-heading">SHOP</p>
            <ul className="navbar__panel-links" role="list">
              {SHOP_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `navbar__panel-link${isActive ? ' navbar__panel-link--active' : ''}`
                    }
                    onClick={close}
                  >
                    {label}
                    <span className="navbar__panel-underline-wrap" aria-hidden="true">
                      <span className="navbar__panel-underline" />
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="navbar__panel-section">
            <p className="navbar__panel-heading">BRAND</p>
            <ul className="navbar__panel-links" role="list">
              {BRAND_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      `navbar__panel-link${isActive ? ' navbar__panel-link--active' : ''}`
                    }
                    onClick={close}
                  >
                    {label}
                    <span className="navbar__panel-underline-wrap" aria-hidden="true">
                      <span className="navbar__panel-underline" />
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Search overlay ── */}
      <div
        className={`navbar__search-overlay${searchOpen ? ' navbar__search-overlay--open' : ''}`}
        aria-hidden={!searchOpen}
      >
        <div className="navbar__search-inner container">
          <div className="navbar__search-input-wrap">
            <FiSearch size={16} className="navbar__search-icon" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search products…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="navbar__search-input"
              aria-label="Search products"
            />
            {query && (
              <button className="navbar__search-clear" onClick={() => setQuery('')} aria-label="Clear search">
                <FiX size={14} />
              </button>
            )}
          </div>

          {query.trim().length > 1 && (
            <div className="navbar__search-results">
              {searchResults.length === 0 ? (
                <p className="navbar__search-empty">No products found for "{query}"</p>
              ) : (
                <ul className="navbar__search-list" role="list">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/shop/${p.id}`}
                        className="navbar__search-result"
                        onClick={closeSearch}
                      >
                        <img
                          src={p.images?.[0]}
                          alt={p.name}
                          className="navbar__search-result-img"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <div className="navbar__search-result-info">
                          <span className="navbar__search-result-collection">{p.collectionName}</span>
                          <span className="navbar__search-result-name">{p.name}</span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
