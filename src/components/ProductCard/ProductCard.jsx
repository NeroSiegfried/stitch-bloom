import { Link } from 'react-router-dom';
import { formatPrice } from '../../data/products';
import './ProductCard.css';

export default function ProductCard({ product, showCollection = false }) {
  const {
    id,
    name,
    price,
    currency,
    images,
    badge,
    customizable,
    measurement,
    collectionName,
  } = product;

  const primaryImage = images?.[0] ?? null;

  return (
    <article className="product-card">
      <Link to={`/shop/${id}`} aria-label={`View ${name}`} tabIndex={-1}>
        <div className="product-card__image-wrap">
          {primaryImage ? (
            <img
              className="product-card__image"
              src={primaryImage}
              alt={name}
              loading="lazy"
            />
          ) : (
            <div className="product-card__placeholder" aria-hidden="true">
              <span>Image coming soon</span>
            </div>
          )}
          {badge && <span className="product-card__badge">{badge}</span>}
          {/* M&S-style hover overlay */}
          <div className="product-card__overlay" aria-hidden="true">
            <span className="product-card__overlay-label">View Product</span>
          </div>
        </div>
      </Link>

      <div className="product-card__info">
        {showCollection && collectionName && (
          <p className="product-card__collection">{collectionName}</p>
        )}
        <h3 className="product-card__name">
          <Link to={`/shop/${id}`}>{name}</Link>
        </h3>
        {measurement && (
          <p className="product-card__meta">{measurement}</p>
        )}
        {customizable && (
          <p className="product-card__customizable">
            <span aria-hidden="true">✦</span> Customisation available
          </p>
        )}
        <p className="product-card__price">{formatPrice(currency, price)}</p>
      </div>
    </article>
  );
}
