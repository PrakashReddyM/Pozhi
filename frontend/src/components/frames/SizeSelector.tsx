import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import type { FrameSize } from "@/services/api";

interface SizeSelectorProps {
  sizes: FrameSize[];
  selectedId: string;
  onSelect: (size: FrameSize) => void;
}

const SizeSelector = ({ sizes, selectedId, onSelect }: SizeSelectorProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {sizes.map((size, index) => {
        const isSelected = selectedId === size.id;

        return (
          <motion.button
            key={size.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onSelect(size)}
            className={`relative flex flex-col items-start gap-1 p-4 rounded-xl border transition-all duration-300 text-left group cursor-pointer overflow-hidden ${
              isSelected
                ? "border-foreground/20 bg-white shadow-lg shadow-black/[0.04]"
                : "border-foreground/5 bg-foreground/[0.01] hover:border-foreground/15 hover:bg-foreground/[0.02]"
            }`}
          >
            {/* Paper texture overlay */}
            <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply pointer-events-none"
                 style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

            {/* Selected check */}
            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-foreground flex items-center justify-center z-10"
                >
                  <Check className="w-2.5 h-2.5 text-background" strokeWidth={4} />
                </motion.div>
              )}
            </AnimatePresence>

            <p className={`relative z-10 text-sm font-heading font-black transition-colors tracking-tight ${
              isSelected ? "text-heading" : "text-foreground/60 group-hover:text-heading"
            }`}>
              {size.sizeLabel}
            </p>

            <span className={`relative z-10 text-lg font-heading font-black tabular-nums transition-colors tracking-tighter ${
              isSelected ? "text-heading" : "text-foreground/40"
            }`}>
              ₹{size.price}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

export default SizeSelector;
