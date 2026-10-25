import { motion, AnimatePresence } from "framer-motion";
import { Check, CornerRightDown } from "lucide-react";
import type { PhotoCopySingle } from "@/services/api";

interface SinglePhotoSelectorProps {
  options: PhotoCopySingle[];
  selectedId: string;
  onSelect: (option: PhotoCopySingle) => void;
}

const SinglePhotoSelector = ({
  options,
  selectedId,
  onSelect,
}: SinglePhotoSelectorProps) => {
  return (
    <AnimatePresence mode="wait">
      <div className="space-y-4">
        <div className="flex items-center gap-4 mb-8 opacity-30">
            <CornerRightDown className="w-3.5 h-3.5" />
            <p className="text-[10px] font-body font-black uppercase tracking-[0.4em]">
                Select Archetype
            </p>
        </div>
        {options.map((option, index) => {
          const isSelected = selectedId === option.id;

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, x: -15, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onSelect(option)}
              className={`w-full relative flex items-center justify-between p-6 rounded-2xl border transition-all duration-500 text-left group cursor-pointer overflow-hidden ${
                isSelected
                  ? "border-foreground/10 bg-white shadow-xl shadow-black/[0.03]"
                  : "border-foreground/5 bg-foreground/[0.01] hover:border-foreground/10 hover:bg-foreground/[0.02]"
              }`}
            >
              {/* Paper texture overlay */}
              <div className="absolute inset-0 opacity-[0.02] mix-blend-multiply pointer-events-none" 
                   style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

              <div className="flex items-center gap-5 relative z-10">
                <div
                  className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-300 ${
                    isSelected
                      ? "border-foreground bg-foreground"
                      : "border-foreground/10 group-hover:border-foreground/30"
                  }`}
                >
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                      >
                        <Check className="w-3.5 h-3.5 text-background" strokeWidth={4} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <p className={`text-md font-heading font-black transition-colors tracking-tight ${
                    isSelected ? "text-heading" : "text-foreground/60 group-hover:text-heading"
                  }`}>
                    {option.sizeLabel}
                  </p>
                  <p className="text-[10px] text-muted-foreground/40 mt-1 font-body font-bold tracking-[0.1em] uppercase">
                    Yield: {option.copies} High-Fidelity Prints
                  </p>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-end">
                <span className={`text-xl font-heading font-black tabular-nums transition-colors tracking-tighter ${
                  isSelected ? "text-heading" : "text-foreground/40"
                }`}>
                  ₹{option.price}
                </span>
                <span className="text-[8px] font-body text-foreground/20 uppercase tracking-[0.2em] mt-1">Single Batch</span>
              </div>

              {/* Selected top highlight */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent shadow-[0_0_10px_rgba(0,0,0,0.05)]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </AnimatePresence>
  );
};

export default SinglePhotoSelector;
