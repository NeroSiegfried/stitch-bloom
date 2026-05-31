import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiShoppingBag, FiMail } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { getAllProducts, formatPrice } from '../../data/products';
import { SITE_CONFIG } from '../../data/siteConfig';
import '../../styles/buttons.css';
import './ProductDetail.css';

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

export default function ProductDetail() {
  const { id } = useParams();
  const { addItem } = useCart();
  const [activeImage, setActiveImage] = useState(0);
  const [activeVariant, setActiveVariant] = useState(0);
  const [added, setAdded] = useState(false);

  const product = getAllProducts().find((p) => p.id === id);

  if (!product) {
    return (
      <main className="pd-not-found">
        <div className="container">
          <p className="pd-not-found__eyebrow">404</p>
          <h1 className="pd-not-found__title">Product not found</h1>
          <Link to="/shop" className="btn-split btn-split--primary">
            <span className="btn-split__label">Back to Shop</span>
            <span className="btn-split__icon" aria-hidden="true">
              <span className="btn-split__arrow btn-split__arrow--1"><ArrowDiag /></span>
              <span className="btn-split__arrow btn-split__arrow--2"><ArrowDiag /></span>
            </span>
          </Link>
        </div>
      </main>
    );
  }

  const hasVariants = product.colorVariants?.length > 0;

  // Which images to show: selected variant > base images > placeholder
  const displayImages = hasVariants
    ? (product.colorVariants[activeVariant]?.images?.length
        ? product.colorVariants[activeVariant].images
        : product.images)
    : (product.images?.length ? product.images : ['/images/placeholder.jpg']);

  // Focal points for the displayed image set
  const displayFocalPoints = hasVariants
    ? (product.colorVariants[activeVariant]?.imageFocalPoints ?? [])
    : (product.imageFocalPoints ?? []);

  const handleVariantChange = (idx) => {
    setActiveVariant(idx);
    setActiveImage(0);
  };

  const handleAddToBag = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const emailSubject = encodeURIComponent(`Custom Order: ${product.name}`);
  const emailBody = encodeURIComponent(
    `Hi,\n\nI'd like to place a custom order for:\n\nProduct: ${product.name}\nCollection: ${product.collectionName}\nPrice: ${formatPrice(product.currency, product.price)}\n\nPlease let me know next steps.\n\nThank you.`
  );

  return (
    <main className="pd-page page-enter">

      {/* ── Product layout ── */}
      <section className="pd-layout">
        {/* Back link — spans full grid width */}
        <Link to="/shop" className="pd-back">← Shop All</Link>
        {/* Gallery */}
        <div className="pd-gallery">
          <div className="pd-gallery__main">
            {product.badge && (
              <span className="pd-gallery__badge">{product.badge}</span>
            )}
            <img
              className="pd-gallery__main-image"
              src={displayImages[activeImage]}
              alt={product.name}
              style={{ objectPosition: displayFocalPoints[activeImage] ?? 'center' }}
              onError={(e) => { e.currentTarget.style.opacity = 0; }}
            />
          </div>
          {displayImages.length > 1 && (
            <div className="pd-gallery__thumbs" role="list" aria-label="Product images">
              {displayImages.map((src, i) => (
                <button
                  key={i}
                  className={`pd-gallery__thumb${i === activeImage ? ' pd-gallery__thumb--active' : ''}`}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  role="listitem"
                >
                  <img src={src} alt=""
                    style={{ objectPosition: displayFocalPoints[i] ?? 'center' }}
                    onError={(e) => { e.currentTarget.style.opacity = 0; }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pd-info">
          <p className="pd-info__collection">{product.collectionName}</p>
          <h1 className="pd-info__name">{product.name}</h1>
          <p className="pd-info__price">{formatPrice(product.currency, product.price)}</p>

          {/* Colour variant selector */}
          {hasVariants && (
            <div className="pd-info__variants">
              <p className="pd-info__variants-label">Colourway</p>
              <div className="pd-info__variant-list">
                {product.colorVariants.map((v, i) => (
                  <button
                    key={v.label}
                    className={`pd-info__variant-btn${i === activeVariant ? ' pd-info__variant-btn--active' : ''}`}
                    onClick={() => handleVariantChange(i)}
                    aria-pressed={i === activeVariant}
                  >
                    <img src={v.images[0]} alt={v.label}
                      onError={(e) => { e.currentTarget.style.opacity = 0; }} />
                    <span>{v.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.customizable && (
            <div className="pd-info__badge">
              <span>Customisable colours available</span>
            </div>
          )}

          {!hasVariants && product.colors?.length > 0 && (
            <div className="pd-info__detail-row">
              <span className="pd-info__detail-label">Available in</span>
              <span className="pd-info__detail-value">{product.colors.join(', ')}</span>
            </div>
          )}

          {product.measurement && (
            <div className="pd-info__detail-row">
              <span className="pd-info__detail-label">Dimensions</span>
              <span className="pd-info__detail-value">{product.measurement}</span>
            </div>
          )}

          {product.weight && (
            <div className="pd-info__detail-row">
              <span className="pd-info__detail-label">Weight</span>
              <span className="pd-info__detail-value">{product.weight}</span>
            </div>
          )}

          {product.description && (
            <p className="pd-info__description">{product.description}</p>
          )}

          <div className="pd-info__divider" aria-hidden="true" />

          <div className="pd-info__actions">
            <button
              className={`btn-split btn-split--primary pd-info__add-btn${added ? ' pd-info__add-btn--added' : ''}`}
              onClick={handleAddToBag}
              aria-live="polite"
            >
              <span className="btn-split__label">
                {added ? 'Added to Bag' : 'Add to Bag'}
              </span>
              <span className="btn-split__icon" aria-hidden="true">
                <span className="btn-split__arrow btn-split__arrow--1">
                  {added ? <FiShoppingBag size={14} /> : <ArrowDiag />}
                </span>
                <span className="btn-split__arrow btn-split__arrow--2">
                  {added ? <FiShoppingBag size={14} /> : <ArrowDiag />}
                </span>
              </span>
            </button>

            <a
              href={`mailto:${SITE_CONFIG.email}?subject=${emailSubject}&body=${emailBody}`}
              className="btn-split"
            >
              <span className="btn-split__label">Order via Email</span>
              <span className="btn-split__icon" aria-hidden="true">
                <span className="btn-split__arrow btn-split__arrow--1"><FiMail size={14} /></span>
                <span className="btn-split__arrow btn-split__arrow--2"><FiMail size={14} /></span>
              </span>
            </a>
          </div>

          <div className="pd-info__meta">
            <p className="pd-info__meta-item">
              <strong>Handcrafted</strong> from 100% recycled T-shirt yarn
            </p>
            <p className="pd-info__meta-item">
              Pre-made: ships in <strong>{SITE_CONFIG.deliveryWindows.premade}</strong>
              &nbsp;·&nbsp; Custom: <strong>{SITE_CONFIG.deliveryWindows.custom}</strong>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
