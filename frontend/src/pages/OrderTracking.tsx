import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Package,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  CreditCard,
  Calendar,
  AlertCircle,
  Truck,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import Navbar from "@/components/Navbar";
import { fetchOrderByNumber, type Order } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

// ─── Status stepper config ──────────────────────────────────────────────────

type StepKey = "pending" | "confirmed" | "processing" | "ready" | "completed";

const STEPS: { key: StepKey; label: string; desc: string }[] = [
  { key: "pending",    label: "Order Placed",    desc: "We've received your order"         },
  { key: "confirmed",  label: "Confirmed",        desc: "Our team has accepted your order"  },
  { key: "processing", label: "In Progress",      desc: "Your order is being prepared"      },
  { key: "ready",      label: "Ready",            desc: "Ready for pickup or delivery"      },
  { key: "completed",  label: "Delivered",        desc: "Order completed successfully"      },
];

const STATUS_ORDER: Record<StepKey, number> = {
  pending: 0, confirmed: 1, processing: 2, ready: 3, completed: 4,
};

function getStepIndex(status: string): number {
  return STATUS_ORDER[status as StepKey] ?? 0;
}

// ─── Payment badge ────────────────────────────────────────────────────────────

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    succeeded: { color: "bg-green-100 text-green-700 border-green-200", label: "Paid" },
    completed: { color: "bg-green-100 text-green-700 border-green-200", label: "Paid" },
    pending:   { color: "bg-yellow-100 text-yellow-700 border-yellow-200", label: "Pending" },
    failed:    { color: "bg-red-100 text-red-700 border-red-200", label: "Failed" },
  };
  const { color, label } = map[status] ?? { color: "bg-gray-100 text-gray-700 border-gray-200", label: status };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
      {label}
    </span>
  );
}

// ─── Order status badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed:  "bg-green-100 text-green-700 border-green-200",
    confirmed:  "bg-blue-100 text-blue-700 border-blue-200",
    processing: "bg-indigo-100 text-indigo-700 border-indigo-200",
    ready:      "bg-teal-100 text-teal-700 border-teal-200",
    pending:    "bg-yellow-100 text-yellow-700 border-yellow-200",
    cancelled:  "bg-red-100 text-red-700 border-red-200",
  };
  const color = map[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${color}`}>
      {status}
    </span>
  );
}

// ─── Progress Stepper ─────────────────────────────────────────────────────────

function ProgressStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl p-4">
        <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
        <div>
          <p className="font-bold text-red-700">Order Cancelled</p>
          <p className="text-sm text-red-500">This order has been cancelled.</p>
        </div>
      </div>
    );
  }

  const currentIdx = getStepIndex(status);

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />
      <div
        className="absolute left-5 top-5 w-0.5 bg-primary transition-all duration-700"
        style={{ height: `${(currentIdx / (STEPS.length - 1)) * 100}%` }}
      />

      <div className="space-y-6 relative">
        {STEPS.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const upcoming = idx > currentIdx;

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.07 }}
              className="flex items-start gap-4"
            >
              {/* Icon */}
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  done
                    ? "bg-primary shadow-lg shadow-primary/25"
                    : active
                    ? "bg-primary shadow-lg shadow-primary/40 ring-4 ring-primary/20"
                    : "bg-gray-100"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : active ? (
                  <Clock className="w-5 h-5 text-white animate-pulse" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                )}
              </div>

              {/* Text */}
              <div className={`pt-1.5 ${upcoming ? "opacity-40" : ""}`}>
                <p className={`text-sm font-bold ${active ? "text-primary" : done ? "text-gray-900" : "text-gray-400"}`}>
                  {step.label}
                  {active && (
                    <span className="ml-2 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Current
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{step.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const OrderTracking = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate(`/account?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (isAuthenticated && orderNumber) {
      fetchOrderByNumber(orderNumber)
        .then(setOrder)
        .catch((err) => setError(err.message || "Order not found"))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading, orderNumber, navigate]);

  return (
    <>
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="min-h-screen pt-24 pb-16 px-4 sm:px-6 bg-slate-50/50"
      >
        <div className="max-w-4xl mx-auto">

          {/* Back button */}
          <button
            onClick={() => navigate("/account")}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </button>

          {loading || authLoading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-gray-500 text-sm">Loading order details…</p>
            </div>
          ) : error || !order ? (
            <div className="bg-white rounded-3xl border border-red-100 p-10 text-center shadow-sm">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h2>
              <p className="text-gray-500 text-sm mb-6">{error || "We couldn't find this order on your account."}</p>
              <button
                onClick={() => navigate("/account")}
                className="px-6 py-3 bg-primary text-white rounded-xl font-bold text-sm"
              >
                View All Orders
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left: Progress + Header */}
              <div className="lg:col-span-2 space-y-6">

                {/* Order header card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-primary" />
                        <span className="text-xs font-black text-primary font-mono bg-primary/10 px-3 py-1 rounded-full tracking-wider">
                          #{order.order_number}
                        </span>
                      </div>
                      <h1 className="text-2xl font-black text-gray-900 tracking-tight">{order.service_type}</h1>
                      <p className="text-sm text-gray-400 mt-1">
                        Placed on {format(new Date(order.created_at), "PPP 'at' p")}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2">
                      <span className="text-3xl font-black text-gray-900">₹{order.total_amount}</span>
                      <div className="flex items-center gap-2">
                        <PaymentBadge status={order.payment_status} />
                        <StatusBadge status={order.order_status} />
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Progress stepper */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm"
                >
                  <h2 className="text-base font-black text-gray-900 mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Order Progress
                  </h2>
                  <ProgressStepper status={order.order_status} />
                </motion.div>

                {/* Order images (if any) */}
                {order.order_items?.some((item) => item.user_uploads?.storage_url) && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm"
                  >
                    <h2 className="text-base font-black text-gray-900 mb-4">Attached Photos</h2>
                    <div className="flex flex-wrap gap-3">
                      {order.order_items.map((item, idx) =>
                        item.user_uploads?.storage_url ? (
                          <div
                            key={idx}
                            className="w-20 h-20 rounded-2xl overflow-hidden border border-gray-200 shadow-sm"
                          >
                            <img
                              src={item.user_uploads.storage_url}
                              alt="Order photo"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : null
                      )}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Right: Order Details */}
              <div className="space-y-5">

                {/* Details card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm"
                >
                  <h2 className="text-sm font-black text-gray-900 mb-5">Order Details</h2>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment</p>
                        <p className="text-sm font-bold text-gray-800 capitalize">{order.payment_status}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ordered</p>
                        <p className="text-sm font-bold text-gray-800">
                          {format(new Date(order.created_at), "dd MMM yyyy")}
                        </p>
                      </div>
                    </div>

                    {order.order_items && order.order_items.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Items</p>
                          {order.order_items.map((item, idx) => (
                            <div key={idx} className="text-sm text-gray-800">
                              <span className="font-bold">{item.item_details?.title || order.service_type}</span>
                              {item.item_details && Object.keys(item.item_details).length > 0 && (
                                <div className="text-xs text-gray-400 mt-0.5 space-y-0.5">
                                  {Object.entries(item.item_details)
                                    .filter(([k]) => !["title", "Photo 1 URL", "Photo 2 URL", "Back Cover URL"].includes(k))
                                    .slice(0, 4)
                                    .map(([k, v]) => (
                                      <div key={k}>
                                        <span className="text-gray-500">{k}:</span> {String(v)}
                                      </div>
                                    ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Help card */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-primary/8 to-primary/4 border border-primary/10 rounded-3xl p-5 text-center"
                >
                  <Star className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-800 mb-1">Need help?</p>
                  <p className="text-xs text-gray-500 mb-4">Our team is happy to assist with your order.</p>
                  <button
                    onClick={() => navigate("/contact")}
                    className="w-full py-2.5 bg-white text-primary font-bold text-sm rounded-xl border border-primary/10 hover:shadow-md transition-all"
                  >
                    Contact Support
                  </button>
                </motion.div>

                {/* Address chip if available */}
                {(order as any).delivery_address && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Delivery Address</p>
                        <p className="text-sm text-gray-700">{(order as any).delivery_address}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.main>
    </>
  );
};

export default OrderTracking;
