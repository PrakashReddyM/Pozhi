import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";

const FeedbackForm = () => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return toast.error("Please select a rating!");
    
    // In a real app, you'd send this to your backend
    console.log("Feedback Submitted:", { rating, comment });
    setSubmitted(true);
    toast.success("Thank you for your feedback!");
  };

  if (submitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 p-6 rounded-2xl bg-primary/5 border border-primary/10 max-w-sm w-full text-center"
      >
        <p className="text-sm font-medium text-primary">
          Thanks for helping us grow! ✨
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1, duration: 0.5 }}
      className="mt-12 w-full max-w-md p-8 rounded-3xl border border-border bg-card/50 backdrop-blur-sm shadow-sm"
    >
      <h3 className="text-lg font-display font-bold text-heading mb-1 text-center">
        How did we do?
      </h3>
      <p className="text-xs text-muted-foreground mb-6 text-center">
        Your feedback helps us make Pozhi even better.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Stars */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="p-1 transition-transform active:scale-90"
            >
              <Star
                className={`w-8 h-8 transition-colors ${
                  star <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <div className="relative">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience (optional)"
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none h-24"
          />
        </div>

        <button
          type="submit"
          disabled={rating === 0}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            rating > 0
              ? "bg-primary text-primary-foreground shadow-md hover:shadow-lg"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
          Send Feedback
        </button>
      </form>
    </motion.div>
  );
};

export default FeedbackForm;
