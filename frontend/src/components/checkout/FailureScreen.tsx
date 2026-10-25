import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Home, X, AlertCircle } from "lucide-react";

interface FailureScreenProps {
  onRetry: () => void;
}

const FailureScreen = ({ onRetry }: FailureScreenProps) => {
  const navigate = useNavigate();

  const shakeAnimation = {
    x: [0, -10, 10, -8, 8, -5, 5, 0],
    rotateZ: [0, -2, 2, -1, 1, -0.5, 0.5, 0],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="flex flex-col items-center justify-center py-20 lg:py-32 gap-12 text-center"
    >
      {/* Error icon — Sophisticated Coral Alert */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 14, delay: 0.2 }}
        className="relative"
      >
        <motion.div
          animate={shakeAnimation}
          transition={{ delay: 0.6, duration: 0.8, ease: "easeInOut" }}
          className="w-32 h-32 rounded-full bg-orange-100/50 border-[6px] border-background flex items-center justify-center shadow-3xl shadow-orange-900/[0.05]"
        >
          <X className="w-14 h-14 text-orange-600" strokeWidth={4} />
        </motion.div>
        
        {/* Urgent Pulsing ring — sophisticated coral */}
        <motion.div 
            animate={{ scale: [1, 1.4, 1.2], opacity: [0.3, 0, 0.1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-x-[-15px] inset-y-[-15px] rounded-full border border-orange-600/20"
        />
      </motion.div>

      {/* Header — Massive Editorial Failure Visual */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-6"
      >
        <h1 className="text-6xl md:text-8xl font-heading font-black text-heading leading-[0.85] tracking-tighter">
          SIGNAL <br /> <span className="text-foreground/10 italic">INTERRUPTED.</span>
        </h1>
        <div className="flex flex-col items-center gap-2">
            <p className="text-md text-muted-foreground font-body font-bold max-w-sm mx-auto opacity-80">
                We had some trouble connecting to the studio. Please try again.
            </p>
            <div className="flex items-center gap-3 mt-4 px-4 py-2 bg-orange-50 border border-orange-100 rounded-full">
                <AlertCircle className="w-3.5 h-3.5 text-orange-600/60" />
                <span className="text-[10px] font-heading font-black tracking-[0.3em] text-orange-600/80 uppercase">No charges applied</span>
            </div>
        </div>
      </motion.div>

      {/* Failure context card — Registry Visual */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="py-10 px-16 rounded-[40px] bg-card border border-foreground/[0.03] relative overflow-hidden group shadow-2xl shadow-black/[0.01]"
      >
          <div className="flex items-center gap-3 opacity-30">
               <span className="text-[11px] font-heading font-black text-muted-foreground uppercase tracking-[0.5em] mb-0.5">Diagnostic Code</span>
               <div className="w-1.5 h-1.5 rounded-full bg-foreground/20" />
               <span className="text-[10px] font-mono font-bold text-foreground tracking-widest uppercase">SIGNAL_FAILED_0X26</span>
          </div>
      </motion.div>

      {/* Actions — Editorial Terminal Nav */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="flex flex-col sm:flex-row items-center gap-6 pt-10"
      >
        <button
          onClick={onRetry}
          className="flex items-center gap-4 px-12 py-6 rounded-3xl bg-foreground text-background font-heading font-black text-xs tracking-[0.4em] uppercase hover:bg-black transition-all shadow-3xl cursor-pointer group"
        >
          <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-1000" />
          Try Again
        </button>

        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-4 px-10 py-6 rounded-3xl border border-foreground/[0.05] bg-foreground/[0.01] text-foreground font-heading font-black text-[11px] tracking-[0.34em] uppercase hover:bg-foreground hover:text-background transition-all cursor-pointer group"
        >
          <Home className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
          Go to Home
        </button>
      </motion.div>
      
      <div className="mt-20 opacity-20">
         <div className="h-px w-24 bg-foreground/10 mx-auto mb-10" />
         <p className="text-[9px] font-body font-black text-foreground uppercase tracking-[0.6em] pointer-events-none">
            POZHI DIGITAL SECURITY CORE // ARCHIVE.002
         </p>
      </div>
    </motion.div>
  );
};

export default FailureScreen;
