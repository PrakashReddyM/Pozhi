import { X, ShoppingCart, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';

export default function CartDrawer() {
  const { items, count, total, isOpen, closeCart, removeItem, updateQuantity, clearCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/40"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="cart-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-[101] bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" />
                <span className="font-bold text-gray-900">
                  Your Cart
                  {count > 0 && (
                    <span className="ml-1.5 text-blue-600">({count})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-gray-400 hover:text-red-500 transition-colors px-2 py-1"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close cart"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
                    <ShoppingCart size={32} className="text-blue-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Your cart is empty</p>
                    <p className="text-gray-400 text-sm">
                      Browse our services and add items to get started.
                    </p>
                  </div>
                  <button
                    onClick={() => { closeCart(); navigate('/studio'); }}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Browse Services <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                /* Cart items */
                <ul className="divide-y divide-gray-50 px-5 py-3">
                  <AnimatePresence initial={false}>
                    {items.map((item) => (
                      <motion.li
                        key={item.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="py-4 flex gap-3"
                      >
                        {/* Thumbnail */}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.serviceTitle}
                            className="w-16 h-16 object-cover rounded-xl flex-shrink-0 bg-gray-100"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <ShoppingCart size={20} className="text-blue-300" />
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 leading-tight truncate">
                            {item.serviceTitle}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">{item.description}</p>
                          <p className="text-blue-600 font-bold text-sm mt-1">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </p>

                          {/* Quantity controls */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={10} />
                            </button>
                            <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-6 h-6 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={10} />
                            </button>
                          </div>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 self-start"
                          aria-label="Remove item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {/* Footer — only when items exist */}
            {items.length > 0 && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-3 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="font-bold text-gray-900">
                    ₹{total.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-gray-400 text-xs">
                  Delivery charges calculated at checkout.
                </p>
                <button
                  onClick={handleCheckout}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
