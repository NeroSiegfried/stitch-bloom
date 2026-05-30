import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { collections, getAllProducts, formatPrice } from '../../data/products';
import useReveal from '../../hooks/useReveal';
import '../../styles/buttons.css';
import './Shop.css';

const ALL_FILTER = 'all';

/* ─── Arrow SVG ─────────────────────────────── */
function ArrowIcon({ dir = 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {dir === 'right' ? (
        <path d="M5 12h14M13 5l7 7-7 7" />
      ) : (
        <path d="M19 12H5M11 19l-7-7 7-7" />
      )}
    </svg>
  );
}

/* ─── Featured Carousel (M&S diagonal style) ── */
function FeaturedCarousel({ products }) {
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [dir, setDir]         = useState('next');
  const total = products.length;

  const go = (direction) => {
    if (leaving) return;
    setDir(direction);
    setLeaving(true);
    setTimeout(() => {
      setCurrent((prev) =>
        direction === 'next'
          ? (prev + 1) % total
          : (prev - 1 + total) % total
      );
      setLeaving(false);
    }, 380);
  };

  const product = products[current];
  const heroImage =
    product.colorVariants?.length > 0
      ? product.colorVariants[0].images[0]
      : product.images[0];

  const pad = (n) => String(n + 1).padStart(2, '0');

  return (
    <div className="fc">
      <div className={`fc__stage${leaving ? ` fc__stage--${dir}` : ''}`}>

        {/* Image block — 58% width on desktop */}
        <div className="fc__image-block">
          <div className="fc__image-wrap">
            <img
              key={heroImage}
              src={heroImage}
              alt={product.name}
              className="fc__image"
              onError={(e) => { e.target.src = '/images/products/placeholder.svg'; }}
            />
          </div>
          {product.badge && (
            <span className="fc__badge">{product.badge}</span>
          )}
          <span className="fc__bg-index" aria-hidden="true">{pad(current)}</span>
        </div>

        {/* Info panel */}
        <div className="fc__info">
          <p className="fc__eyebrow">{product.collectionName}</p>
          <h2 className="fc__name">{product.name}</h2>
          <p className="fc__price">{formatPrice(product.currency, product.price)}</p>
          <p className="fc__desc">{product.description}</p>

          {product.colors?.length > 0 && (
            <p className="fc__colors">
              <span className="fc__colors-label">Available in ·</span>{' '}
              {product.colors.join(', ')}
            </p>
          )}

          {product.customizable && (
            <p className="fc__custom">
              <span aria-hidden="true">✦</span> Customisation available
            </p>
          )}

          <div className="fc__actions">
            <a
              href={`mailto:thestitchbloom@yahoo.com?subject=Order enquiry: ${encodeURIComponent(product.name)}`}
              className="btn btn--primary"
            >
              Order via Email
            </a>
            <a
              href="https://instagram.com/thestitchbloomco"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost"
            >
              DM on Instagram
            </a>
          </div>

          {product.colorVariants?.length > 1 && (
            <div className="fc__variants">
              {product.colorVariants.map((v) => (
                <div key={v.label} className="fc__variant-thumb-wrap">
                  <img
                    src={v.images[0]}
                    alt={v.label}
                    className="fc__variant-thumb"
                    onError={(e) => { e.target.src = '/images/products/placeholder.svg'; }}
                  />
                  <span className="fc__variant-label">{v.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Nav bar */}
      <div className="fc__nav">
        <button className="fc__arrow" onClick={() => go('prev')} aria-label="Previous product">
          <ArrowIcon dir="left" />
        </button>
        <span className="fc__counter" aria-live="polite" aria-atomic="true">
          <strong>{pad(current)}</strong>
          <span className="fc__counter-slash" aria-hidden="true"> / </span>
          <span className="fc__counter-total">{pad(total - 1)}</span>
        </span>
        <button className="fc__arrow" onClick={() => go('next')} aria-label="Next product">
          <ArrowIcon dir="right" />
        </button>
      </div>
    </div>
  );
}

/* ─── Grid card ─────────────────────────────── */
function ShopCard({ product }) {
  const displayImage =
    product.colorVariants?.length > 0
      ? product.colorVariants[0].images[0]
      : product.images[0];

  return (
    <article className="sc reveal" id={product.id}>
      <a
        href={`mailto:thestitchbloom@yahoo.com?subject=Order enquiry: ${encodeURIComponent(product.name)}`}
        className="sc__image-link"
        aria-label={`Enquire about ${product.name}`}
      >
        <div className="sc__image-wrap">
          <img
            src={displayImage}
            alt={product.name}
            className="sc__image"
            loading="lazy"
            onError={(e) => { e.target.src = '/images/products/placeholder.svg'; }}
          />
          <div className="sc__overlay" aria-hidden="true">
            <span className="sc__overlay-label">Enquire</span>
          </div>
          {product.badge && (
            <span className="sc__badge">{product.badge}</span>
          )}
        </div>
      </a>
      <div className="sc__info">
        <p className="sc__collection">{product.collectionName}</p>
        <h3 className="sc__name">{product.name}</h3>
        <p className="sc__price">{formatPrice(product.currency, product.price)}</p>
        {product.colorVariants?.length > 1 && (
          <p className="sc__variants">{product.colorVariants.length} colourways</p>
        )}
      </div>
    </article>
  );
}

/* ─── Page ──────────────────────────────────── */
export default function Shop() {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const revealRef = useReveal();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [location.hash]);

  const allProducts = getAllProducts();
  const filterOptions = [
    { id: ALL_FILTER, label: 'All' },
    ...collections.map((c) => ({ id: c.id, label: c.name })),
  ];

  const filteredProducts =
    activeFilter === ALL_FILTER
      ? allProducts
      : allProducts.filter((p) => p.collectionId === activeFilter);

  const featuredProducts = allProducts.filter((p) => p.collectionId === 'najma');

  return (
    <main className="page-enter" ref={revealRef}>

      {/* ── Page header ── */}
      <header className="shop-header">
        <p className="shop-header__eyebrow">Handcrafted in Nigeria</p>
        <h1 className="shop-header__title">The Collection</h1>
        <p className="shop-header__subtitle">
          Every piece is made by hand from recycled textiles —<br />
          crafted with care, worn with intention.
        </p>
      </header>

      {/* ── Featured Carousel ── */}
      <section className="shop-featured" aria-label="Featured products">
        <div className="container">
          <div className="shop-featured__head reveal">
            <p className="shop-featured__eyebrow">Featured</p>
            <div className="shop-featured__title-row">
              <h2 className="shop-featured__title">Najma Collection</h2>
              <span className="shop-featured__rule" aria-hidden="true" />
            </div>
          </div>
        </div>
        <FeaturedCarousel products={featuredProducts} />
      </section>

      {/* ── Filter tabs ── */}
      <div className="shop-filters" role="navigation" aria-label="Filter products">
        <div className="container">
          <div className="shop-filters__inner" role="tablist">
            {filterOptions.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeFilter === id}
                className={`shop-filter-tab${activeFilter === id ? ' shop-filter-tab--active' : ''}`}
                onClick={() => setActiveFilter(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Product grid ── */}
      <section className="section shop-grid-section">
        <div className="container">
          <div className="shop-grid">
            {filteredProducts.map((product) => (
              <ShopCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
