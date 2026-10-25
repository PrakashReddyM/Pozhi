import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

/**
 * A cart line carries everything the order endpoint needs, because the cart has to
 * survive a page refresh. That means no File objects — images are uploaded when the
 * item is added and only their ids/urls are kept here.
 */
export interface CartItem {
  id: string;
  service: string;
  serviceTitle: string;
  description: string;
  price: number;
  quantity: number;
  imageUrl?: string;

  // The server re-prices from these; `price` above is display only.
  priceField: string;
  priceId: string;

  details: Record<string, string>;
  uploadIds: string[];
  uploadUrls: string[];

  bookingDate?: string;
  bookingTime?: string;
}

interface CartContextType {
  items: CartItem[];
  count: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = 'pozhi_cart';

function loadStoredCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Two lines merge only if they're the same product AND the same photos. */
function signatureOf(item: Omit<CartItem, 'id'>) {
  return [
    item.service,
    item.priceField,
    item.priceId,
    item.description,
    [...item.uploadIds].sort().join(','),
  ].join('|');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadStoredCart);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage can be unavailable (private mode, quota). The cart still works
      // for this session.
    }
  }, [items]);

  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: Omit<CartItem, 'id'>) => {
    setItems((prev) => {
      const signature = signatureOf(item);
      const existing = prev.find((i) => signatureOf(i) === signature);
      if (existing) {
        return prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, id: `${item.service}-${Date.now()}-${prev.length}` }];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity < 1 || quantity > 100) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity } : i)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  return (
    <CartContext.Provider
      value={{ items, count, total, isOpen, openCart, closeCart, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
