import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const messages = [
  "Inbound Order Verification...",
  "Authenticating Payment Ledger...",
  "Securing Studio Slot...",
  "Finalizing Asset Config...",
];

const ProcessingOverlay = () => {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
      animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
      exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/40 gap-16 text-center"
    >
      {/* Cinematic Spinner — High-End Ivory Logic */}
      <div className="relative w-32 h-32">
        {/* Outer orbital — Fine line charcoal */}
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
           className="absolute inset-0 rounded-full border border-foreground/[0.05]"
        >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-foreground rounded-full shadow-lg" />
        </motion.div>
        
        {/* Inner spinner — Polished brass effect */}
        <motion.div
          className="absolute inset-6 rounded-full border-[1.5px] border-transparent border-t-orange-300/40 border-l-orange-300/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Core pulse — Soft Ivory glow */}
        <motion.div
          className="absolute inset-12 rounded-full bg-foreground/[0.03]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="space-y-6">
        <div className="h-8 flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.p
                    key={msgIndex}
                    initial={{ opacity: 0, y: 15, filter: "blur(10px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -15, filter: "blur(10px)" }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="text-lg font-heading font-black text-heading uppercase tracking-[0.2em]"
                >
                    {messages[msgIndex]}
                </motion.p>
            </AnimatePresence>
        </div>
        <p className="text-[10px] text-muted-foreground/40 font-body font-bold uppercase tracking-[0.5em]">
            Precision Synchronization in Progress
        </p>
      </div>

      {/* Progress line — Editorial Minimalist */}
      <div className="w-56 h-px bg-foreground/[0.05] relative overflow-hidden">
        <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
        />
      </div>
    </motion.div>
  );
};

export default ProcessingOverlay;
