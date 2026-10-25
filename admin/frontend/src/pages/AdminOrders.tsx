import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageCircle, Check, Truck, User, X, Loader2, Download,
  Phone, Calendar, Search, MapPin,
  Clock, CreditCard, ChevronRight
} from "lucide-react";
import { fetchAllOrders, updateOrderStatus, downloadProtectedImage, API_BASE_URL } from "@/services/api";
import AuthedImage from "@/components/admin/AuthedImage";

// Internal UI Order interface
interface AdminUiOrder {
  id: string; // Friendly ID (Order Number)
  originalId: string; // UUID
  service: string;
  detail: string;
  title: string;
  quantity: number;
  price: number;
  customer: string;
  phone: string;
  status: "pending" | "processing" | "delivered" | "cancelled" | "completed";
  createdAt: string;
  images: string[];
  itemsCount: number;
  paymentStatus: string;
  itemDetails?: Record<string, any>;
  feedbackRating?: number;
  feedbackComment?: string;
  address: string;
  addressPincode?: string;
  giftWrapCharge: number;
  deliveryCharge: number;
}



const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminUiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [selectedOrder, setSelectedOrder] = useState<AdminUiOrder | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await fetchAllOrders();

      const mappedOrders: AdminUiOrder[] = data.map(o => {
        let status: AdminUiOrder['status'] = 'pending';
        const rawStatus = (o.order_status || '').toLowerCase();

        if (['delivered', 'completed', 'cancelled'].includes(rawStatus)) {
          status = rawStatus as any;
        } else if (['processing', 'shipped'].includes(rawStatus)) {
          status = 'processing';
        }

        const allImages = new Set<string>();
        let firstItemDetails: Record<string, any> | undefined = undefined;

        o.order_items?.forEach((i: any) => {
          // Primary source: the join table, ordered by position.
          const joined = Array.isArray(i.order_item_uploads) ? i.order_item_uploads : [];
          joined
            .slice()
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .forEach((j: any) => {
              if (j.user_uploads?.storage_url) {
                allImages.add(`${API_BASE_URL}/upload/view-by-url?url=${encodeURIComponent(j.user_uploads.storage_url)}`);
              }
            });

          // Fallback 1: legacy single-upload FK (pre-migration orders, or any
          // item that for some reason has no join rows).
          const upload = Array.isArray(i.user_uploads) ? i.user_uploads[0] : i.user_uploads;
          if (upload?.storage_url) {
            allImages.add(`${API_BASE_URL}/upload/view-by-url?url=${encodeURIComponent(upload.storage_url)}`);
          }

          if (i.item_details) {
            if (!firstItemDetails) firstItemDetails = i.item_details;
            // Fallback 2: legacy "Photo N URL" / "Back Cover URL" strings
            // stuffed into item_details by the old Checkout.tsx code path
            // (historical orders only).
            Object.values(i.item_details).forEach(v => {
              if (typeof v === 'string' && v.startsWith('http')) {
                allImages.add(`${API_BASE_URL}/upload/view-by-url?url=${encodeURIComponent(v)}`);
              }
            });
          }
        });

        return {
          id: o.order_number,
          originalId: o.id,
          service: o.service_type || "Order",
          detail: o.order_items && o.order_items.length > 0
            ? o.order_items[0].title || `${o.order_items.length} item(s)`
            : "No items",
          title: o.order_items?.[0]?.title || "Unknown Item",
          quantity: o.order_items?.[0]?.quantity || 1,
          price: o.total_amount,
          customer: (o as any).customer_name || "Guest Customer",
          phone: (o as any).customer_phone || "",
          status: status,
          createdAt: new Date(o.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
          }),
          images: Array.from(allImages),
          itemsCount: o.order_items?.length || 0,
          paymentStatus: o.payment_status || 'pending',
          itemDetails: firstItemDetails,
          address: o.delivery_address || '',
          addressPincode: o.address_pincode,
          giftWrapCharge: Number(o.gift_wrap_charge) || 0,
          deliveryCharge: Number(o.delivery_charge) || 0,
          feedbackRating: (o as any).feedback_rating,
          feedbackComment: (o as any).feedback_comment
        };
      });

      // Sort by newest first
      // Note: Assuming API returns loosely sorted, but robust sort here is good
      mappedOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setOrders(mappedOrders);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  const markDone = async (id: string, newStatus: string) => {
    // Optimistic update
    setOrders(prev => prev.map(o => o.originalId === id ? { ...o, status: newStatus as any } : o));
    if (selectedOrder?.originalId === id) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
    }

    try {
      await updateOrderStatus(id, newStatus);
      // Play success sound
      // Using context for reliable sound if needed, but keeping it simple
    } catch (err) {
      console.error("Failed to update status", err);
      loadOrders(); // Revert on error
    }
  };

  const openWhatsApp = (phone: string, orderId: string, type: 'update' | 'delivery' | 'location' = 'update') => {
    if (!phone) return alert("No phone number available");

    let text = "";
    if (type === 'update') {
      text = `Hello! Your order #${orderId} from Pozhi Studio is Ready! 📸✨ \nYou can pick it up or we can deliver it.`;
    } else if (type === 'location') {
      text = `Hi! This is Pozhi Studio. Your order #${orderId} is finished! 📸 \nPlease share your live location here so we can deliver it to you. You can pay Cash/UPI on delivery. 🙏`;
    } else {
      text = `Hello! Is this a good time to deliver your order #${orderId}? 🚚`;
    }

    let cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length === 10) {
      cleanPhone = `91${cleanPhone}`;
    }

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Filter orders based on tab
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'active') return ['pending', 'processing'].includes(o.status);
    return ['delivered', 'completed', 'cancelled'].includes(o.status);
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order Management</h1>
          <p className="text-gray-500 mt-1">Manage and track all studio orders</p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100/80 rounded-xl backdrop-blur-sm self-start md:self-auto">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "active"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            Active Orders
            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-xs ${activeTab === 'active' ? 'bg-gray-100' : 'bg-gray-200'}`}>
              {orders.filter(o => ['pending', 'processing'].includes(o.status)).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === "history"
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
              }`}
          >
            History
          </button>
        </div>
      </div>

      {/* Order Table */}
      {filteredOrders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200"
        >
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No {activeTab} orders found</h3>
          <p className="text-gray-500">New orders will appear here automatically.</p>
        </motion.div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Customer</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Order</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Photos</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-right font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Amount</th>
                  <th className="text-left font-semibold text-gray-500 text-xs uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order, index) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      onClick={() => setSelectedOrder(order)}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Details Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[480px] bg-white z-50 shadow-2xl overflow-y-auto"
            >
              <OrderDrawer
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                openWhatsApp={openWhatsApp}
                markDone={markDone}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// SUB-COMPONENTS
// ==========================================

const OrderRow = React.forwardRef<HTMLTableRowElement, {
  order: AdminUiOrder,
  onClick: () => void,
  index: number
}>(({ order, onClick, index }, ref) => {
  const statusIconBg = order.status === 'pending' ? 'bg-orange-50 text-orange-500' :
    order.status === 'processing' ? 'bg-blue-50 text-blue-500' :
      'bg-emerald-50 text-emerald-500';

  return (
    <motion.tr
      ref={ref}
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ delay: index * 0.02 }}
      onClick={onClick}
      className="group border-b border-gray-50 last:border-0 hover:bg-gray-50/60 cursor-pointer transition-colors"
    >
      {/* Customer */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${statusIconBg}`}>
            {order.status === 'pending' ? <Clock className="w-4.5 h-4.5" /> :
              order.status === 'processing' ? <Loader2 className="w-4.5 h-4.5" /> :
                <Check className="w-4.5 h-4.5" />}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 leading-tight truncate">{order.customer}</p>
            <p className="text-xs text-gray-400 truncate">#{order.id}</p>
          </div>
        </div>
      </td>

      {/* Order / Service */}
      <td className="px-5 py-3.5 max-w-[220px]">
        <p className="font-medium text-gray-700 truncate">{order.service}</p>
        <p className="text-xs text-gray-500 truncate">{order.detail}</p>
      </td>

      {/* Photos */}
      <td className="px-5 py-3.5">
        {order.images.length > 0 ? (
          <div className="flex items-center -space-x-2">
            {order.images.slice(0, 3).map((img, i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-50 overflow-hidden ring-1 ring-gray-100">
                <AuthedImage src={img} className="w-full h-full object-cover" />
              </div>
            ))}
            {order.images.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 ring-1 ring-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                +{order.images.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Date */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-1.5 text-gray-500 whitespace-nowrap">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          {order.createdAt.split(',')[0]}
        </div>
      </td>

      {/* Amount */}
      <td className="px-5 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1.5 font-semibold text-gray-900 whitespace-nowrap">
          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
          ₹{order.price}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-600'
          }`}>
          {order.status}
        </span>
      </td>

      {/* Chevron */}
      <td className="px-5 py-3.5">
        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
      </td>
    </motion.tr>
  );
});

const OrderDrawer = ({ order, onClose, openWhatsApp, markDone }: {
  order: AdminUiOrder,
  onClose: () => void,
  openWhatsApp: (phone: string, id: string, type: 'update' | 'delivery' | 'location') => void,
  markDone: (id: string, status: string) => void
}) => {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Order #{order.id}</h2>
          <p className="text-sm text-gray-500">{order.createdAt}</p>
        </div>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8">

        {/* Status Section */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Status</h3>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-lg font-bold text-sm ${order.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
              {order.status.toUpperCase()}
            </div>
            {!['delivered', 'completed', 'cancelled'].includes(order.status) && (
              <button
                onClick={() => markDone(order.originalId, 'delivered')}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                Mark Completed
              </button>
            )}
          </div>
        </section>

        {/* Customer Details */}
        <section className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Customer</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{order.customer}</p>
                <p className="text-sm text-gray-500">Customer Name</p>
              </div>
            </div>
            {order.phone && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{order.phone}</p>
                  <button onClick={() => openWhatsApp(order.phone, order.id, 'update')} className="text-xs font-medium text-emerald-600 hover:underline">
                    Chat on WhatsApp
                  </button>
                </div>
              </div>
            )}
            {order.address && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-400 shadow-sm shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 leading-snug whitespace-pre-line break-words">
                    {order.address}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500">Delivery Address</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(order.address)}
                      className="text-xs font-medium text-indigo-600 hover:underline"
                    >
                      Copy
                    </button>
                    {order.addressPincode && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-medium text-indigo-600 hover:underline"
                      >
                        Open in Maps
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Order Details */}
        <section>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Order Items</h3>
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="p-4 flex flex-col gap-3 border-b border-gray-50 bg-indigo-50/30">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{order.service}</span>
                <span className="text-indigo-600 font-bold bg-indigo-100 px-2 py-0.5 rounded-full text-xs">
                  Qty: {order.quantity}
                </span>
              </div>
              
              {/* Highlighted Action Banner */}
              <div className="bg-white border border-indigo-100 rounded-lg p-3 shadow-sm flex items-start gap-3">
                <div className="mt-0.5 p-1.5 bg-indigo-100 rounded-md text-indigo-600">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">Action Required</p>
                  <p className="text-sm font-medium text-gray-900">
                    Prepare <span className="font-bold text-indigo-700">{order.quantity} {order.quantity > 1 ? 'copies' : 'copy'}</span> of <span className="font-bold text-indigo-700">{order.title}</span>.
                  </p>
                </div>
              </div>
            </div>
            {order.itemDetails && Object.keys(order.itemDetails).length > 0 && (
              <div className="p-4 border-b border-gray-50 space-y-2">
                {Object.entries(order.itemDetails)
                  .filter(([k]) => !k.includes('URL'))
                  .map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="text-gray-500">{k}</span>
                    <span className="font-medium text-gray-900 text-right">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {order.feedbackRating && (
              <div className="p-4 border-b border-gray-50 bg-yellow-50/30">
                <h4 className="text-xs font-bold text-yellow-700 uppercase mb-2">Customer Feedback</h4>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <svg key={star} className={`w-4 h-4 ${star <= order.feedbackRating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-100'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                  ))}
                </div>
                {order.feedbackComment && (
                  <p className="text-sm text-gray-700 italic">"{order.feedbackComment}"</p>
                )}
              </div>
            )}

            <div className="p-4 bg-gray-50/50 space-y-2">
              {(order.giftWrapCharge > 0 || order.deliveryCharge > 0) && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Items</span>
                    <span className="text-gray-700">
                      ₹{order.price - order.giftWrapCharge - order.deliveryCharge}
                    </span>
                  </div>
                  {order.giftWrapCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Gift wrap</span>
                      <span className="text-gray-700">₹{order.giftWrapCharge}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery</span>
                    <span className="text-gray-700">
                      {order.deliveryCharge > 0 ? `₹${order.deliveryCharge}` : 'Free'}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <span className="text-sm font-medium text-gray-500">Total Amount</span>
                <span className="text-xl font-bold text-gray-900">₹{order.price}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Assets / Images */}
        {order.images.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
              Uploaded Assets ({order.images.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {order.images.map((img, i) => (
                <div key={i} className="group relative aspect-square rounded-xl bg-gray-100 overflow-hidden border border-gray-200">
                  <AuthedImage src={img} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => downloadProtectedImage(`${img}&download=true`, `order-${order.id}-${i + 1}.jpg`)}
                      className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-colors"
                      aria-label="Download original"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col gap-3">
        <div className="flex gap-3">
          <button
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            onClick={() => openWhatsApp(order.phone, order.id, 'update')}
          >
            <MessageCircle className="w-4 h-4" />
            Ready Msg
          </button>
          <button
            className="flex-1 py-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold text-xs hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
            onClick={() => openWhatsApp(order.phone, order.id, 'location')}
          >
            <MapPin className="w-4 h-4" />
            Req Location
          </button>
        </div>
        <button
          className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10"
          onClick={() => openWhatsApp(order.phone, order.id, 'delivery')}
        >
          <Truck className="w-4 h-4" />
          Out for Delivery
        </button>
      </div>
    </div>
  );
};

export default AdminOrders;

