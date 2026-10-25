import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Copy, Home, FileText, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { submitOrderFeedback } from "@/services/api";

interface SuccessScreenProps {
  orderNumber: string;
}

/* ---------- Confetti particle ---------- */
const Particle = ({ index }: { index: number }) => {
  const angle = (index / 16) * 360;
  const distance = 60 + Math.random() * 80;
  const x = Math.cos((angle * Math.PI) / 180) * distance;
  const y = Math.sin((angle * Math.PI) / 180) * distance;
  const colors = [
    "bg-primary",
    "bg-green-400",
    "bg-yellow-400",
    "bg-pink-400",
    "bg-blue-400",
    "bg-orange-400",
  ];
  const color = colors[index % colors.length];
  const size = 4 + Math.random() * 6;

  return (
    <motion.div
      className={`absolute rounded-full ${color}`}
      style={{ width: size, height: size, top: "50%", left: "50%" }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x,
        y,
        opacity: [1, 1, 0],
        scale: [0, 1.2, 0.4],
        rotate: Math.random() * 720,
      }}
      transition={{
        duration: 0.9 + Math.random() * 0.4,
        delay: 0.3 + Math.random() * 0.15,
        ease: "easeOut",
      }}
    />
  );
};

const SuccessScreen = ({ orderNumber }: SuccessScreenProps) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(orderNumber);
    toast.success("Order ID copied!");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const submitFeedback = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (rating === 0) {
      toast.error("Please select a rating before submitting.");
      return;
    }
    setIsSubmitting(true);
    
    try {
      await submitOrderFeedback(orderNumber, rating, comment);
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* Animated checkmark path */
  const checkVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.6, delay: 0.2, ease: "easeOut" as const },
    },
  };

  const circleVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="flex flex-col items-center justify-center py-16 md:py-24 gap-6 text-center"
    >
      {/* Checkmark + Confetti container */}
      <div className="relative w-28 h-28 flex items-center justify-center">
        {/* Confetti particles */}
        {Array.from({ length: 16 }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}

        {/* Success circle + check SVG */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.1 }}
          className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center shadow-xl shadow-green-500/20"
        >
          <svg
            viewBox="0 0 52 52"
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <motion.circle
              cx="26"
              cy="26"
              r="23"
              variants={circleVariants}
              initial="hidden"
              animate="visible"
            />
            <motion.path
              d="M14 27l8 8 16-16"
              variants={checkVariants}
              initial="hidden"
              animate="visible"
            />
          </svg>
        </motion.div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
          Order Confirmed!
        </h1>
        <p className="text-slate-500 font-medium max-w-sm mx-auto">
          Thank you for choosing Pozhi Photography Studio. We've received your order and will start working on it soon.
        </p>
      </div>

      {/* Order ID Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-white border-2 border-slate-100 p-4 rounded-3xl flex flex-col items-center gap-2 shadow-sm"
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Order Identification
        </span>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-black text-primary tracking-tight font-mono">
            #{orderNumber}
          </span>
          <button
            onClick={copyId}
            className="p-2.5 rounded-xl hover:bg-slate-50 active:scale-95 transition-all text-slate-400 hover:text-primary"
          >
            <Copy className={copied ? "text-green-500 w-5 h-5" : "w-5 h-5"} />
          </button>
        </div>
      </motion.div>

      {!feedbackSubmitted ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="w-full max-w-md bg-white border border-slate-100 rounded-3xl p-6 shadow-xl shadow-slate-200/50 flex flex-col gap-5 mt-4"
        >
          <div className="flex flex-col items-center gap-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-primary" />
              How was your experience?
            </h3>
            <p className="text-sm text-slate-500">
              Please share your feedback to continue to your order details.
            </p>
          </div>

          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
              >
                <svg
                  className={`w-10 h-10 transition-colors ${
                    (hoverRating || rating) >= star ? "text-yellow-400 fill-yellow-400" : "text-slate-200 fill-slate-100"
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                </svg>
              </button>
            ))}
          </div>

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you liked or how we can improve..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm resize-none"
          />

          <button
            type="button"
            onClick={submitFeedback}
            disabled={isSubmitting || rating === 0}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center transition-all ${
              rating > 0 && !isSubmitting
                ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary/90"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            }`}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm mt-4"
        >
          <button
            onClick={() => navigate(`/orders/${orderNumber}`)}
            className="w-full py-4 rounded-2xl bg-slate-900 text-white font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            <FileText className="w-4 h-4" />
            Track Order
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full py-4 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
          >
            <Home className="w-4 h-4" />
            Back Home
          </button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default SuccessScreen;