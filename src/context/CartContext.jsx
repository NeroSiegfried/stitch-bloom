import { createContext, useContext, useState, useCallback } from 'react';
import { formatPrice } from '../data/products';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems]   = useState([]);
  const [isOpen, setIsOpen] = useState(false);

  const addItem = useCallback((product) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQty = useCallback((id, delta) => {
    setItems((prev) =>
      prev
        .map((i) => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter((i) => i.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  /* Build a mailto: body from current cart items */
  const buildOrderEmail = () => {
    const lines = items.map(
      (i) => `• ${i.name} × ${i.qty} — ${formatPrice(i.currency, i.price)}`
    );
    const subject = encodeURIComponent('Order from The Stitch Bloom');
    const body = encodeURIComponent(
      `Hello,\n\nI would like to order the following:\n\n${lines.join('\n')}\n\nTotal: ${formatPrice('₦', total)}\n\nPlease confirm availability and payment details.\n\nThank you.`
    );
    return `mailto:thestitchbloom@yahoo.com?subject=${subject}&body=${body}`;
  };

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      total, count, isOpen, setIsOpen, buildOrderEmail,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}
