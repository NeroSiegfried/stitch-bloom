import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { FiShoppingBag } from 'react-icons/fi';
import { SITE_CONFIG } from '../../data/siteConfig';
import { useCart } from '../../context/CartContext';
import { formatPrice } from '../../data/products';
import { useCatalog } from '../../context/CatalogContext';
import { assetUrl } from '../../utils/assetUrl';
import useReveal from '../../hooks/useReveal';
import usePageMeta from '../../hooks/usePageMeta';
import { countOf } from '../../utils/plural';
import '../../styles/buttons.css';
import './Shop.css';

const ALL_FILTER = 'all';

/* ─── Top-right diagonal arrow (M&S style) ─── */
function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <line x1="2" y1="12" x2="12" y2="2" />
      <polyline points="4,2 12,2 12,10" />
    </svg>
  );
}

/* ─── Left/Right arrow for carousel nav ─────── */
function NavArrow({ dir = 'right' }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
  const [activeVariant, setActiveVariant] = useState(0);
  const { addItem } = useCart();
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
      setActiveVariant(0);
      setLeaving(false);
    }, 380);
  };

  const product = products[current];
  const hasVariants = product.colorVariants?.length > 0;
  const activeVariantData = hasVariants ? (product.colorVariants[activeVariant] ?? product.colorVariants[0]) : null;
  const heroImage = hasVariants
    ? (activeVariantData.images?.[0] ?? product.images?.[0])
    : product.images?.[0];
  const heroFocalPoint = hasVariants
    ? (activeVariantData.imageFocalPoints?.[0] ?? 'center')
    : (product.imageFocalPoints?.[0] ?? 'center');

  const pad = (n) => String(n + 1).padStart(2, '0');

  return (
    <div className="fc">
      <div className={`fc__stage${leaving ? ` fc__stage--${dir}` : ''}`}>

        {/* Image block — 58% width on desktop */}
        <div className="fc__image-block">
          <Link to={`/shop/${product.id}`} className="fc__image-link" aria-label={`View ${product.name}`}>
            <div className="fc__image-wrap">
              <img
                key={heroImage}
                src={heroImage}
                alt={product.name}
                className="fc__image"
                style={{ objectPosition: heroFocalPoint }}
                onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
              />
            </div>
          </Link>
          {product.badge && (
            <span className="fc__badge">{product.badge}</span>
          )}
          <span className="fc__bg-index" aria-hidden="true">{pad(current)}</span>

          {/* Nav arrows overlaid on image — bottom-left corner */}
          <div className="fc__image-nav">
            <button className="fc__arrow fc__arrow--prev" onClick={() => go('prev')} aria-label="Previous product">
              <span className="fc__arrow-icon fc__arrow-icon--1"><NavArrow dir="left" /></span>
              <span className="fc__arrow-icon fc__arrow-icon--2"><NavArrow dir="left" /></span>
            </button>
            <span className="fc__counter" aria-live="polite" aria-atomic="true">
              <strong>{pad(current)}</strong>
              <span className="fc__counter-slash" aria-hidden="true"> / </span>
              <span className="fc__counter-total">{pad(total - 1)}</span>
            </span>
            <button className="fc__arrow fc__arrow--next" onClick={() => go('next')} aria-label="Next product">
              <span className="fc__arrow-icon fc__arrow-icon--1"><NavArrow dir="right" /></span>
              <span className="fc__arrow-icon fc__arrow-icon--2"><NavArrow dir="right" /></span>
            </button>
          </div>
        </div>

        {/* Info panel */}
        <div className="fc__info">
          <p className="fc__eyebrow">{product.collectionName}</p>
          <h2 className="fc__name">{product.name}</h2>
          <p className="fc__price">{formatPrice(product.currency, product.price)}</p>
          <p className="fc__desc">{product.description}</p>

          {product.colors?.length > 0 && !hasVariants && (
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
            <button
              className="btn-split"
              onClick={() => addItem(product, activeVariantData?.label || null)}
            >
              <span className="btn-split__label">Add to Bag</span>
              <span className="btn-split__icon"><FiShoppingBag size={14} /></span>
            </button>
            <a
              href={`mailto:thestitchbloom@yahoo.com?subject=Order enquiry: ${encodeURIComponent(product.name)}`}
              className="btn-split"
            >
              <span className="btn-split__label">Order via Email</span>
              <span className="btn-split__icon">
                <span className="btn-split__arrow btn-split__arrow--1"><ArrowIcon /></span>
                <span className="btn-split__arrow btn-split__arrow--2"><ArrowIcon /></span>
              </span>
            </a>
            <a
              href={SITE_CONFIG.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-split"
            >
              <span className="btn-split__label">DM on Instagram</span>
              <span className="btn-split__icon">
                <span className="btn-split__arrow btn-split__arrow--1"><ArrowIcon /></span>
                <span className="btn-split__arrow btn-split__arrow--2"><ArrowIcon /></span>
              </span>
            </a>
          </div>

          {hasVariants && (
            <div className="fc__variants">
              <p className="fc__variants-label">Colourway</p>
              <div className="fc__variant-list">
                {product.colorVariants.map((v, j) => (
                  <button
                    key={v.label}
                    className={`fc__variant-btn${j === activeVariant ? ' fc__variant-btn--active' : ''}`}
                    onClick={() => setActiveVariant(j)}
                    aria-pressed={j === activeVariant}
                  >
                    <span className="fc__variant-thumb-wrap">
                      <img
                        src={v.images[0]}
                        alt={v.label}
                        className="fc__variant-thumb"
                        onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
                      />
                      {v.badge && (
                        <span className="fc__variant-badge">{v.badge}</span>
                      )}
                    </span>
                    <span className="fc__variant-label">{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ─── Grid card ─────────────────────────────── */
function ShopCard({ product }) {
  const { addItem } = useCart();
  const hasVariants = product.colorVariants?.length > 0;
  const displayImage = hasVariants
    ? product.colorVariants[0].images[0]
    : product.images[0];
  const focalPoint = hasVariants
    ? (product.colorVariants[0].imageFocalPoints?.[0] ?? 'center')
    : (product.imageFocalPoints?.[0] ?? 'center');

  return (
    <article className="sc" id={product.id}>
      <Link
        to={`/shop/${product.id}`}
        className="sc__image-link"
        aria-label={`View ${product.name}`}
      >
        <div className="sc__image-wrap">
          <img
            src={displayImage}
            alt={product.name}
            className="sc__image"
            loading="lazy"
            style={{ objectPosition: focalPoint }}
            onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
          />
          <div className="sc__overlay" aria-hidden="true">
            <span className="sc__overlay-label">View Product</span>
          </div>
          {product.badge && (
            <span className="sc__badge">{product.badge}</span>
          )}
        </div>
      </Link>
      <div className="sc__info">
        <Link to={`/shop/${product.id}`} className="sc__name-link">
          <p className="sc__collection">{product.collectionName}</p>
          <h3 className="sc__name">{product.name}</h3>
        </Link>
        <p className="sc__price">{formatPrice(product.currency, product.price)}</p>
        {product.colorVariants?.length > 1 && (
          <p className="sc__variants">{countOf(product.colorVariants.length, 'colourway')}</p>
        )}
        <button
          className="sc__add-btn btn-split"
          onClick={() => addItem(product, product.colorVariants?.[0]?.label || null)}
          aria-label={`Add ${product.name} to bag`}
        >
          <span className="btn-split__label">Add to Bag</span>
          <span className="btn-split__icon"><FiShoppingBag /></span>
        </button>
      </div>
    </article>
  );
}

/* ─── Page ──────────────────────────────────── */
export default function Shop() {
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER);
  const revealRef = useReveal();
  const { collections, products: allProducts } = useCatalog();

  usePageMeta({
    title: 'Shop the Collection',
    description: 'Browse our full range of handcrafted crochet bags — each piece made from recycled T-shirt yarn and finished by hand in Abuja, Nigeria.',
    path: '/shop',
  });

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    }
  }, [location.hash]);

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
          {featuredProducts.length > 0 && <FeaturedCarousel products={featuredProducts} />}
        </div>
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

      {/* ── Product grid — grouped by collection with anchor IDs ── */}
      <section className="section shop-grid-section">
        <div className="container">
          {activeFilter === ALL_FILTER ? (
            /* When showing all: group by collection with heading anchors */
            filterOptions
              .filter((f) => f.id !== ALL_FILTER)
              .map(({ id, label }) => {
                const group = allProducts.filter((p) => p.collectionId === id);
                if (!group.length) return null;
                return (
                  <div key={id} id={id} className="shop-collection-group">
                    <h2 className="shop-collection-group__title">{label}</h2>
                    <div className="shop-grid">
                      {group.map((product) => (
                        <ShopCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                );
              })
          ) : (
            <div id={activeFilter} className="shop-grid">
              {filteredProducts.map((product) => (
                <ShopCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
