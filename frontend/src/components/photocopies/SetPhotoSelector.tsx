import { motion, AnimatePresence } from "framer-motion";
import { Check, Minus, Plus, CornerRightDown } from "lucide-react";
import type { PhotoCopySet } from "@/services/api";

interface SetPhotoSelectorProps {
  sizes: PhotoCopySet[];
  selectedId: string;
  quantity: number;
  onSelectSize: (size: PhotoCopySet) => void;
  onQuantityChange: (qty: number) => void;
}

const SetPhotoSelector = ({
  sizes,
  selectedId,
  quantity,
  onSelectSize,
  onQuantityChange,
}: SetPhotoSelectorProps) => {
  const selectedSize = sizes.find((s) => s.id === selectedId);

  return (
    <AnimatePresence mode="wait">
      <div className="space-y-16">
        {/* Size Selection */}
        <div className="space-y-8">
          <div className="flex items-center gap-4 mb-8 opacity-30">
              <CornerRightDown className="w-3.5 h-3.5" />
              <p className="text-[10px] font-body font-black uppercase tracking-[0.4em]">
                Geometry Archetype
              </p>
          </div>
          <div className="space-y-4">
            {sizes.map((size, index) => {
              const isSelected = selectedId === size.id;

              return (
                <motion.button
                  key={size.id}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  onClick={() => onSelectSize(size)}
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
                      className={`w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-500 ${
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
                        {size.sizeLabel}
                      </p>
                      <p className="text-[10px] text-muted-foreground/40 mt-1 font-body font-bold tracking-[0.15em] uppercase">
                        ₹{size.pricePerPiece} Per Unit Yield
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Quantity Stepper — Premium Ivory Board */}
        <div className="space-y-10">
          <div className="flex items-center gap-4 mb-8 opacity-30">
              <CornerRightDown className="w-3.5 h-3.5" />
              <p className="text-[10px] font-body font-black uppercase tracking-[0.4em]">
                Replication Volume
              </p>
          </div>
          
          <div className="flex flex-col items-center gap-10 p-10 rounded-[40px] bg-card border border-foreground/[0.03] relative overflow-hidden shadow-2xl shadow-black/[0.02]">
             {/* Soft radial glow */}
             <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-100 rounded-full blur-3xl animate-pulse" />
             </div>

            <div className="flex items-center gap-12 relative z-10">
              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.04)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-16 h-16 rounded-[24px] border border-foreground/[0.05] bg-foreground/[0.02] flex items-center justify-center transition-all duration-500 disabled:opacity-20 disabled:cursor-not-allowed group cursor-pointer"
              >
                <Minus className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
              </motion.button>

              <div className="flex flex-col items-center min-w-[140px]">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={quantity}
                    initial={{ opacity: 0, scale: 0.8, filter: "blur(5px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.2, filter: "blur(5px)" }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="text-7xl md:text-8xl font-heading font-black text-heading tabular-nums tracking-tighter"
                  >
                    {quantity}
                  </motion.span>
                </AnimatePresence>
                <span className="text-[10px] font-body font-black text-muted-foreground/30 uppercase tracking-[0.6em] mt-3">
                    ARCHIVAL UNITS
                </span>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.04)" }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onQuantityChange(quantity + 1)}
                className="w-16 h-16 rounded-[24px] border border-foreground/[0.05] bg-foreground/[0.02] flex items-center justify-center transition-all duration-500 group cursor-pointer"
              >
                <Plus className="w-6 h-6 text-foreground/40 group-hover:text-foreground transition-colors" />
              </motion.button>
            </div>

            <div className="relative z-10 w-full pt-8 mt-6 border-t border-foreground/[0.05] flex justify-between items-center px-10">
              <span className="text-[11px] text-muted-foreground/40 font-body font-bold uppercase tracking-[0.3em]">Total Composite Yield</span>
              <AnimatePresence mode="wait">
                  <motion.p 
                    key={quantity * (selectedSize?.pricePerPiece ?? 0)}
                    initial={{ opacity: 0, y: 10, filter: "blur(5px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -10, filter: "blur(5px)" }}
                    className="text-2xl font-heading font-black text-heading tabular-nums tracking-tighter"
                  >
                        ₹{(quantity * (selectedSize?.pricePerPiece ?? 0)).toLocaleString()}
                  </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {selectedSize && (selectedSize.copiesPerUnit ?? 1) > 1 && (
            <p className="text-center text-[10px] text-muted-foreground/20 font-body font-black uppercase tracking-[0.5em] mt-10">
                Expected: {quantity * (selectedSize.copiesPerUnit ?? 1)} High-Fidelity Prints
            </p>
          )}
        </div>
      </div>
    </AnimatePresence>
  );
};

export default SetPhotoSelector;
