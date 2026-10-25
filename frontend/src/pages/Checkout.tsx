import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle, Lock, QrCode, Calendar, Gift, MapPin, Loader2, Truck, AlertCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import Navbar from "@/components/Navbar";
import ProcessingOverlay from "@/components/checkout/ProcessingOverlay";
import SuccessScreen from "@/components/checkout/SuccessScreen";
import FailureScreen from "@/components/checkout/FailureScreen";
import type { CartItem } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { createOrder, createPaymentOrder, verifyPayment, reverseGeocode } from "@/services/api";

const GIFT_WRAP_PRICE = 30;

// Mirrors the server-side rule in backend/src/api/orders/orders.controller.ts.
// Display only: the server recomputes every charge from the catalogue and its
// total is what actually gets charged. Keep the two in sync.
const DELIVERY_CHARGE = 30;
const FREE_DELIVERY_THRESHOLD = 199;

// The threshold looks at the item subtotal only - gift wrap is an add-on and
// does not buy free delivery.
const resolveDeliveryCharge = (subtotal: number) =>
  subtotal > FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

interface DeliveryAddress {
  house: string;
  street: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
}

type AddressErrors = Partial<Record<keyof DeliveryAddress, string>>;
type AddressTouched = Partial<Record<keyof DeliveryAddress, boolean>>;

const EMPTY_ADDRESS: DeliveryAddress = {
  house: "",
  street: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
};

/** Field rules match createStudioOrderSchema on the server. */
const validateAddress = (a: DeliveryAddress): AddressErrors => {
  const errors: AddressErrors = {};

  if (!a.house.trim()) errors.house = "House / flat number is required";
  else if (a.house.trim().length > 120) errors.house = "Too long (max 120 characters)";

  if (a.street.trim().length < 3) errors.street = "Street / area is required";
  else if (a.street.trim().length > 200) errors.street = "Too long (max 200 characters)";

  if (a.landmark.trim().length > 200) errors.landmark = "Too long (max 200 characters)";

  if (a.city.trim().length < 2) errors.city = "City is required";
  if (a.state.trim().length < 2) errors.state = "State is required";

  if (!/^[1-9]\d{5}$/.test(a.pincode.trim())) {
    errors.pincode = "Enter a valid 6-digit PIN code";
  }

  return errors;
};

type GeoNotice = { kind: "info" | "error"; text: string } | null;

type PaymentStatus = "idle" | "processing" | "success" | "error";

const pageVariants = {
  initial: { opacity: 0, y: 40, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -20, scale: 0.98 },
};

const staggerContainer = {
  animate: {
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const fadeSlideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

const Checkout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { items: cartItems, total: cartTotal, clearCart } = useCart();

  // A booking carries its own date/time; take it from whichever line has one.
  const bookingItem = cartItems.find((i) => i.bookingDate);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState<DeliveryAddress>(EMPTY_ADDRESS);
  const [addressTouched, setAddressTouched] = useState<AddressTouched>({});
  const [isLocating, setIsLocating] = useState(false);
  const [geoNotice, setGeoNotice] = useState<GeoNotice>(null);
  const [eventDate, setEventDate] = useState(bookingItem?.bookingDate || "");
  const [bookingTime, setBookingTime] = useState(bookingItem?.bookingTime || "");
  const [isGiftWrapped, setIsGiftWrapped] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);

  // Enforce login
  useEffect(() => {
    if (!authLoading && !isAuthenticated && location.pathname === "/checkout") {
      // Redirect to login with current path as redirect parameter
      // The cart persists on its own, so there's no order state to carry over.
      navigate(`/account?redirectTo=${encodeURIComponent(location.pathname)}`);
    }
  }, [isAuthenticated, authLoading, navigate, location.pathname]);

  // Autofill user details if logged in
  useEffect(() => {
    if (user) {
      if (user.full_name && !name) setName(user.full_name);
      if (user.email && !email) setEmail(user.email);
      if (user.phone && !mobile) setMobile(user.phone);
    }
  }, [user, name, email, mobile]);

  // Nothing to check out — but don't bounce while the success screen is showing,
  // since the cart is cleared the moment payment is confirmed.
  useEffect(() => {
    if (
      cartItems.length === 0 &&
      status !== "success" &&
      !authLoading &&
      isAuthenticated &&
      location.pathname === "/checkout"
    ) {
      navigate("/", { replace: true });
    }
  }, [cartItems.length, status, authLoading, isAuthenticated, navigate, location.pathname]);

  const giftWrapCharge = isGiftWrapped ? GIFT_WRAP_PRICE : 0;
  const deliveryCharge = useMemo(() => resolveDeliveryCharge(cartTotal), [cartTotal]);

  const finalTotal = useMemo(
    () => cartTotal + giftWrapCharge + deliveryCharge,
    [cartTotal, giftWrapCharge, deliveryCharge]
  );

  const addressErrors = useMemo(() => validateAddress(address), [address]);

  const setAddressField = useCallback((field: keyof DeliveryAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }, []);

  const touchAddressField = useCallback((field: keyof DeliveryAddress) => {
    setAddressTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  /**
   * Fill the address fields from the device GPS position.
   * Every failure path leaves the form untouched and usable - this is a
   * shortcut, never a requirement.
   */
  const handleUseMyLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoNotice({ kind: "error", text: "Your browser can't share location. Please type your address below." });
      return;
    }

    // getCurrentPosition fails silently on an insecure origin.
    if (!window.isSecureContext) {
      setGeoNotice({ kind: "error", text: "Location needs a secure (https) connection. Please type your address below." });
      return;
    }

    setIsLocating(true);
    setGeoNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await reverseGeocode(position.coords.latitude, position.coords.longitude);
          const found = result.data;

          // Only overwrite a field we actually resolved something for, and never
          // touch the landmark - that is local knowledge the customer supplies.
          setAddress((prev) => ({
            house: found.house || prev.house,
            street: found.street || prev.street,
            landmark: prev.landmark,
            city: found.city || prev.city,
            state: found.state || prev.state,
            pincode: found.pincode || prev.pincode,
          }));

          const incomplete = !found.house || !found.street || !found.pincode;
          setGeoNotice({
            kind: "info",
            text: incomplete
              ? "Filled in what we could find - please complete and check the rest."
              : "Address filled from your location - please check it before paying.",
          });
        } catch (error) {
          setGeoNotice({
            kind: "error",
            text: error instanceof Error && error.message
              ? error.message
              : "Couldn't look up your location. Please type your address below.",
          });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        const text =
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Please type your address below."
            : error.code === error.TIMEOUT
              ? "Finding your location took too long. Please type your address below."
              : "Your location isn't available right now. Please type your address below.";
        setGeoNotice({ kind: "error", text });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handlePlaceOrder = useCallback(async () => {
    if (cartItems.length === 0 || !isAuthenticated) return;
    setStatus("processing");

    try {
      // Photos were uploaded when each line was added to the cart, so there's
      // nothing left to upload here — just map the lines to order items.
      // Every uploaded image rides along via upload_ids, linked relationally
      // through order_item_uploads on the server (not stuffed into details).
      const items = cartItems.map((line) => ({
        service_type: line.service,
        title: line.serviceTitle,
        quantity: line.quantity,
        unit_price: line.price,
        // Server re-prices from this id; unit_price above is display-only.
        [line.priceField]: line.priceId,
        ...(line.uploadIds.length ? { upload_ids: line.uploadIds } : {}),
        details: {
          ...line.details,
          ...(line.bookingTime ? { "Arrival Window": line.bookingTime } : {}),
        },
      }));

      // Create order in DB. Each line carries its own service_type; the order-level
      // one is the headline service for admin listings.
      const result = await createOrder({
        service_type: cartItems[0].service,
        items,
        customer_name: name,
        customer_email: email,
        customer_phone: mobile,
        // The server concatenates these into delivery_address, so the admin
        // portal and WhatsApp templates keep reading one string as before.
        address_house: address.house.trim(),
        address_street: address.street.trim(),
        address_landmark: address.landmark.trim() || null,
        address_city: address.city.trim(),
        address_state: address.state.trim(),
        address_pincode: address.pincode.trim(),
        event_date: eventDate || null,
        gift_wrap: isGiftWrapped
      });

      if (!result.success || !result.data?.order_id) {
        throw new Error("Failed to create order");
      }

      const orderId: string = result.data.order_id;
      const orderNumber: string = result.data.order_number;

      // Create Razorpay payment order
      const paymentOrder = await createPaymentOrder(orderId);

      // Open Razorpay checkout modal
      const rzp = new window.Razorpay({
        key: paymentOrder.keyId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency,
        name: "Pozhi Studio",
        description: cartItems.length === 1
          ? cartItems[0].serviceTitle
          : `${cartItems.length} items`,
        order_id: paymentOrder.razorpayOrderId,
        prefill: { name, email, contact: mobile },
        theme: { color: "#2563EB" },
        handler: async (response) => {
          try {
            await verifyPayment({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setPlacedOrderNumber(orderNumber);
            setStatus("success");
            // Only once payment is actually confirmed.
            clearCart();
          } catch {
            setStatus("error");
          }
        },
        modal: {
          ondismiss: () => {
            // User closed the modal without paying — return to form
            setStatus("idle");
          },
        },
      });

      rzp.on("payment.failed", () => setStatus("error"));
      rzp.open();

    } catch (error) {
      console.error("Order failed:", error);
      setStatus("error");
    }
  }, [cartItems, name, email, mobile, address, eventDate, isGiftWrapped, isAuthenticated, clearCart]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
  }, []);

  if (cartItems.length === 0 && status !== "success") return null;

  const isFormValid = name.trim().length > 0 &&
                     email.trim().length > 0 &&
                     mobile.trim().length >= 10 &&
                     Object.keys(addressErrors).length === 0;

  return (
    <>
      <Navbar />
      <motion.main
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen pt-24 pb-40 px-4 sm:px-6 bg-slate-50/50"
      >
        <div className="max-w-5xl mx-auto">
          <AnimatePresence mode="wait">
            {status === "processing" && (
              <ProcessingOverlay key="processing" />
            )}
            
            {status === "success" && (
              <SuccessScreen 
                key="success" 
                orderNumber={placedOrderNumber || "LOS-PENDING"}
              />
            )}
            
            {status === "error" && (
              <FailureScreen key="error" onRetry={handleRetry} />
            )}

            {status === "idle" && (
              <motion.div key="checkout">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
                    <p className="text-sm text-muted-foreground">Complete your order details</p>
                  </div>
                </div>

                <CheckoutForm
                  cartItems={cartItems}
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  mobile={mobile}
                  setMobile={setMobile}
                  address={address}
                  addressErrors={addressErrors}
                  addressTouched={addressTouched}
                  onAddressChange={setAddressField}
                  onAddressBlur={touchAddressField}
                  isLocating={isLocating}
                  geoNotice={geoNotice}
                  onUseMyLocation={handleUseMyLocation}
                  eventDate={eventDate}
                  setEventDate={setEventDate}
                  isGiftWrapped={isGiftWrapped}
                  setIsGiftWrapped={setIsGiftWrapped}
                  subtotal={cartTotal}
                  deliveryCharge={deliveryCharge}
                  finalTotal={finalTotal}
                  isFormValid={isFormValid}
                  onPlaceOrder={handlePlaceOrder}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.main>
    </>
  );
};

const ADDRESS_FIELDS: {
  field: keyof DeliveryAddress;
  label: string;
  placeholder: string;
  autoComplete: string;
  fullWidth?: boolean;
  numeric?: boolean;
  maxLength: number;
}[] = [
  { field: "house", label: "House / Flat No. *", placeholder: "e.g. 2-14/B, Flat 301", autoComplete: "address-line1", fullWidth: true, maxLength: 120 },
  { field: "street", label: "Street / Area *", placeholder: "e.g. Road No. 5, Banjara Hills", autoComplete: "address-line2", fullWidth: true, maxLength: 200 },
  { field: "landmark", label: "Landmark (optional)", placeholder: "e.g. opposite Reliance Fresh", autoComplete: "off", fullWidth: true, maxLength: 200 },
  { field: "city", label: "City *", placeholder: "e.g. Hyderabad", autoComplete: "address-level2", maxLength: 100 },
  { field: "state", label: "State *", placeholder: "e.g. Telangana", autoComplete: "address-level1", maxLength: 100 },
  { field: "pincode", label: "PIN Code *", placeholder: "e.g. 500034", autoComplete: "postal-code", numeric: true, maxLength: 6 },
];

interface AddressFieldsProps {
  address: DeliveryAddress;
  errors: AddressErrors;
  touched: AddressTouched;
  onChange: (field: keyof DeliveryAddress, value: string) => void;
  onBlur: (field: keyof DeliveryAddress) => void;
  isLocating: boolean;
  geoNotice: GeoNotice;
  onUseMyLocation: () => void;
}

const AddressFields = ({
  address,
  errors,
  touched,
  onChange,
  onBlur,
  isLocating,
  geoNotice,
  onUseMyLocation,
}: AddressFieldsProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Delivery Address *
      </span>
      <button
        type="button"
        onClick={onUseMyLocation}
        disabled={isLocating}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
          isLocating
            ? "border-slate-200 text-slate-400 cursor-wait"
            : "border-primary/20 text-primary hover:bg-primary/5"
        }`}
      >
        {isLocating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <MapPin className="w-3.5 h-3.5" />
        )}
        {isLocating ? "Finding your location" : "Use my current location"}
      </button>
    </div>

    {geoNotice && (
      <div
        role="status"
        className={`flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 ${
          geoNotice.kind === "error"
            ? "bg-amber-50 text-amber-800"
            : "bg-emerald-50 text-emerald-800"
        }`}
      >
        {geoNotice.kind === "error" ? (
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
        ) : (
          <CheckCircle className="w-4 h-4 flex-shrink-0 mt-px" />
        )}
        <span>{geoNotice.text}</span>
      </div>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {ADDRESS_FIELDS.map(({ field, label, placeholder, autoComplete, fullWidth, numeric, maxLength }) => {
        // Only nag once the customer has left the field.
        const error = touched[field] ? errors[field] : undefined;

        return (
          <div key={field} className={fullWidth ? "sm:col-span-2" : undefined}>
            <label
              htmlFor={`address-${field}`}
              className="text-xs font-medium text-muted-foreground mb-1.5 block"
            >
              {label}
            </label>
            <input
              id={`address-${field}`}
              type="text"
              inputMode={numeric ? "numeric" : "text"}
              autoComplete={autoComplete}
              maxLength={maxLength}
              value={address[field]}
              onChange={(e) =>
                onChange(field, numeric ? e.target.value.replace(/\D/g, "") : e.target.value)
              }
              onBlur={() => onBlur(field)}
              placeholder={placeholder}
              aria-invalid={!!error}
              aria-describedby={error ? `address-${field}-error` : undefined}
              className={`w-full px-4 py-3 rounded-xl border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 transition-all text-sm ${
                error
                  ? "border-red-300 focus:ring-red-100 focus:border-red-400"
                  : "border-border focus:ring-primary/20 focus:border-primary"
              }`}
            />
            {error && (
              <p id={`address-${field}-error`} className="mt-1.5 text-xs text-red-500">
                {error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

interface CheckoutFormProps {
  cartItems: CartItem[];
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  mobile: string;
  setMobile: (v: string) => void;
  address: DeliveryAddress;
  addressErrors: AddressErrors;
  addressTouched: AddressTouched;
  onAddressChange: (field: keyof DeliveryAddress, value: string) => void;
  onAddressBlur: (field: keyof DeliveryAddress) => void;
  isLocating: boolean;
  geoNotice: GeoNotice;
  onUseMyLocation: () => void;
  eventDate: string;
  setEventDate: (v: string) => void;
  isGiftWrapped: boolean;
  setIsGiftWrapped: (v: boolean) => void;
  subtotal: number;
  deliveryCharge: number;
  finalTotal: number;
  isFormValid: boolean;
  onPlaceOrder: () => void;
}

const CheckoutForm = ({
  cartItems,
  name,
  setName,
  email,
  setEmail,
  mobile,
  setMobile,
  address,
  addressErrors,
  addressTouched,
  onAddressChange,
  onAddressBlur,
  isLocating,
  geoNotice,
  onUseMyLocation,
  eventDate,
  setEventDate,
  isGiftWrapped,
  setIsGiftWrapped,
  subtotal,
  deliveryCharge,
  finalTotal,
  isFormValid,
  onPlaceOrder,
}: CheckoutFormProps) => (
  <motion.div
    variants={staggerContainer}
    initial="initial"
    animate="animate"
    className="flex flex-col lg:flex-row gap-8 lg:gap-12"
  >
    {/* Left Column: Form */}
    <div className="flex-1 space-y-8">
      <motion.div variants={fadeSlideUp} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          Customer Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email Address *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for order confirmation"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          {/* Mobile */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              WhatsApp Mobile Number *
            </label>
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
            />
          </div>

          {/* Delivery Address */}
          <div className="sm:col-span-2">
            <AddressFields
              address={address}
              errors={addressErrors}
              touched={addressTouched}
              onChange={onAddressChange}
              onBlur={onAddressBlur}
              isLocating={isLocating}
              geoNotice={geoNotice}
              onUseMyLocation={onUseMyLocation}
            />
          </div>

          {/* Event Date (Only for Snap & Print) */}
          {cartItems.some((i) => i.service === "SnapnPrint") && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Event Date (Optional)
              </label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
            </div>
          )}
        </div>
      </motion.div>

      {/* Options */}
      <motion.div variants={fadeSlideUp} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          Add-ons & Options
        </h2>

        <div className="flex items-start space-x-3 space-y-0">
          <Checkbox 
            id="giftwrap" 
            checked={isGiftWrapped}
            onCheckedChange={(checked) => setIsGiftWrapped(checked === true)}
            className="mt-1"
          />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="giftwrap"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Add Gift Wrap (₹{GIFT_WRAP_PRICE})
            </label>
            <p className="text-sm text-muted-foreground">
              Make it special with our premium packaging and a handwritten note.
            </p>
          </div>
        </div>
      </motion.div>
    </div>

    {/* Right Column: Order Summary */}
    <div className="w-full lg:w-[380px]">
      <div className="lg:sticky top-28 space-y-6">
        <motion.div variants={fadeSlideUp} className="bg-white rounded-3xl p-8 text-slate-900 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-lg font-semibold mb-6 pb-6 border-b border-slate-100">Order Summary</h2>
          
          <div className="space-y-5 mb-8">
            {cartItems.map((line) => (
              <div key={line.id} className="space-y-2">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <p className="font-medium leading-snug">{line.serviceTitle}</p>
                    <p className="text-xs text-slate-500">
                      {line.service}
                      {line.quantity > 1 && ` · ×${line.quantity}`}
                    </p>
                  </div>
                  <p className="font-semibold flex-shrink-0">
                    ₹{(line.price * line.quantity).toLocaleString("en-IN")}
                  </p>
                </div>

                {Object.entries(line.details).map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm py-1 border-t border-slate-50 pt-2">
                    <span className="text-slate-500">{label}</span>
                    <span className="font-medium text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            ))}

            <div className="flex justify-between text-sm py-1 border-t border-slate-100 pt-3">
              <span className="text-slate-500">Subtotal</span>
              <span className="font-medium text-slate-700">₹{subtotal.toLocaleString("en-IN")}</span>
            </div>

            {isGiftWrapped && (
              <div className="flex justify-between text-sm text-slate-600 py-1">
                <span>Gift Wrap</span>
                <span>₹{GIFT_WRAP_PRICE}</span>
              </div>
            )}

            <div className="flex justify-between text-sm text-slate-600 py-1">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                Delivery
              </span>
              {deliveryCharge === 0 ? (
                <span className="font-semibold text-emerald-600">FREE</span>
              ) : (
                <span>₹{deliveryCharge}</span>
              )}
            </div>

            {deliveryCharge > 0 && (
              <p className="text-xs text-slate-400">
                Free delivery on orders above ₹{FREE_DELIVERY_THRESHOLD}
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-6 border-t border-slate-100 mb-8">
            <span className="text-slate-500 font-medium">Total Amount</span>
            <span className="text-3xl font-bold text-slate-900">₹{finalTotal.toLocaleString("en-IN")}</span>
          </div>

          <button
            onClick={onPlaceOrder}
            disabled={!isFormValid}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              isFormValid 
                ? 'bg-primary text-white hover:bg-primary/90 shadow-primary/25' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Lock className="w-4 h-4" />
            Place Order
          </button>
          
          <p className="text-[10px] text-center mt-4 text-slate-400 uppercase tracking-widest font-semibold">
            Secure payments powered by Razorpay
          </p>
        </motion.div>

        <motion.div variants={fadeSlideUp} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4 text-sm">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold">Quality Assured</p>
              <p className="text-slate-500 text-xs">Premium printing & fast delivery</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </motion.div>
);

export default Checkout;