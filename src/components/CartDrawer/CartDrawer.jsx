import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatPrice } from '../../data/products';
import { deliveryFeeForState, deliveryLabelForZone, deliveryZoneForState } from '../../data/delivery';
import { assetUrl } from '../../utils/assetUrl';
import { FiX, FiMinus, FiPlus, FiShoppingBag } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import './CartDrawer.css';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, removeItem, updateQty, total, count, clearCart, buildOrderEmail } = useCart();
  const { user } = useAuth();
  const deliveryZone = deliveryZoneForState(user?.state);
  const savedDelivery = deliveryZone
    ? { label: deliveryLabelForZone(deliveryZone), fee: deliveryFeeForState(user.state) }
    : null;

  return (
    <>
      {/* Fixed overlay close button — exactly overlaps navbar cart cell */}
      {isOpen && (
        <button
          className="cart-close-overlay"
          onClick={() => setIsOpen(false)}
          aria-label="Close bag"
        >
          <FiX size={18} />
        </button>
      )}

      {/* Backdrop */}
      <div
        className={`cart-backdrop${isOpen ? ' cart-backdrop--open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`cart-drawer${isOpen ? ' cart-drawer--open' : ''}`}
        aria-label="Shopping bag"
        aria-modal="true"
        role="dialog"
      >
        {/* Header */}
        <div className="cart-drawer__head">
          <div className="cart-drawer__title-row">
            <FiShoppingBag className="cart-drawer__bag-icon" aria-hidden="true" />
            <h2 className="cart-drawer__title">Your Bag</h2>
            {count > 0 && <span className="cart-drawer__count">{count}</span>}
          </div>
          <button
            className="cart-drawer__close"
            onClick={() => setIsOpen(false)}
            aria-label="Close bag"
          >
            <FiX />
          </button>
        </div>

        {/* Items */}
        <div className="cart-drawer__body">
          {items.length === 0 ? (
            <div className="cart-drawer__empty">
              <FiShoppingBag className="cart-drawer__empty-icon" aria-hidden="true" />
              <p className="cart-drawer__empty-text">Your bag is empty</p>
              <button className="btn btn--secondary" onClick={() => setIsOpen(false)}>
                Continue Shopping
              </button>
            </div>
          ) : (
            <ul className="cart-drawer__list" role="list">
              {items.map((item) => {
                const thumb =
                  item.colorVariants?.length > 0
                    ? (item.colorVariants.find((variant) => variant.label === item.variantLabel) || item.colorVariants[0]).images[0]
                    : item.images?.[0];
                return (
                  <li key={item.cartKey || item.id} className="cart-item">
                    <div className="cart-item__image-wrap">
                      <img
                        src={thumb}
                        alt={item.name}
                        className="cart-item__image"
                        onError={(e) => { e.target.src = assetUrl('/images/products/placeholder.svg'); }}
                      />
                    </div>
                    <div className="cart-item__info">
                      <div className="cart-item__name-row">
                        <div>
                          <p className="cart-item__name">{item.name}</p>
                          {item.variantLabel && <p className="cart-item__variant">{item.variantLabel}</p>}
                        </div>
                        <span className="cart-item__price">{formatPrice(item.currency, item.price)}</span>
                      </div>
                      <div className="cart-item__qty-row">
                          <button
                            className="cart-item__qty-btn"
                            onClick={() => updateQty(item.cartKey || item.id, -1)}
                            aria-label="Decrease quantity"
                          >
                            <FiMinus size={14} />
                          </button>
                          <span className="cart-item__qty">{item.qty}</span>
                          <button
                            className="cart-item__qty-btn"
                            onClick={() => updateQty(item.cartKey || item.id, 1)}
                            aria-label="Increase quantity"
                          >
                            <FiPlus size={14} />
                          </button>
                          <button
                            className="cart-item__qty-btn cart-item__qty-btn--remove"
                            onClick={() => removeItem(item.cartKey || item.id)}
                            aria-label={`Remove ${item.name}`}
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer with total + CTA */}
        {items.length > 0 && (
          <div className="cart-drawer__foot">
            <div className="cart-drawer__total-row">
              <span className="cart-drawer__total-label">Subtotal</span>
              <span className="cart-drawer__total-value">{formatPrice('₦', total)}</span>
            </div>
            <p className="cart-drawer__note">
              {savedDelivery
                ? `${savedDelivery.label} · ${formatPrice('₦', savedDelivery.fee)}`
                : 'Delivery: FCT ₦5,500 · Outside FCT ₦14,000.'}
            </p>
            <Link
              to="/checkout"
              className="btn btn--primary cart-drawer__order-btn"
              onClick={() => setIsOpen(false)}
            >
              Secure Checkout
            </Link>
            <a href={buildOrderEmail()} className="cart-drawer__email-link" onClick={() => setIsOpen(false)}>
              Prefer to enquire by email?
            </a>
            <button className="cart-drawer__clear" onClick={clearCart}>
              Clear bag
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
