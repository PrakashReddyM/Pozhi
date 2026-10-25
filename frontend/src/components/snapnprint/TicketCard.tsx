import { motion, AnimatePresence } from "framer-motion";
import { Check, Zap, MapPin, CornerRightDown } from "lucide-react";
import type { SnapnPrintPackage } from "@/services/api";

interface TicketCardProps {
  pkg: SnapnPrintPackage;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

const TicketCard = ({ pkg, isSelected, onSelect, index }: TicketCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      onClick={onSelect}
      className={`relative w-full text-left rounded-3xl border transition-all duration-700 cursor-pointer overflow-hidden group ${isSelected
        ? "border-foreground/10 bg-white shadow-2xl shadow-black/[0.04] scale-[1.02]"
        : "border-foreground/5 bg-foreground/[0.01] hover:border-foreground/8 hover:bg-foreground/[0.02]"
        }`}
    >
      {/* Paper / Ticket Texture */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-multiply pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

      <div className="flex items-stretch overflow-hidden">
        {/* Left Side — Selector Section */}
        <div className="p-8 border-r border-dashed border-foreground/10 flex flex-col items-center justify-center bg-foreground/[0.01]">
          <div className={`w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-500 ${isSelected ? "border-foreground bg-foreground shadow-lg" : "border-foreground/10"
            }`}>
            <AnimatePresence>
              {isSelected && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <Check className="w-3.5 h-3.5 text-background" strokeWidth={4} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className={`h-12 w-px mt-4 bg-gradient-to-b from-foreground/10 to-transparent transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`} />
        </div>

        {/* Right Side — Ticket Content */}
        <div className="flex-1 p-8">
          <div className="flex justify-between items-start mb-4">

            <div className="flex items-center gap-2 opacity-10">
              <MapPin className="w-3 h-3" />
              <span className="text-[8px] font-mono font-bold tracking-tighter">STUDIO.FieldUnits</span>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div>
              <h3 className={`text-2xl font-heading font-black tracking-tighter mb-1 transition-colors ${isSelected ? "text-heading" : "text-foreground/60 group-hover:text-heading"
                }`}>
                {pkg.label}
              </h3>
              <p className="text-[10px] text-muted-foreground/40 font-body font-bold uppercase tracking-[0.2em]">
                Instant Print Yield
              </p>
            </div>

            <div className="text-right">
              <span className={`text-3xl font-heading font-black tabular-nums tracking-tighter transition-colors ${isSelected ? "text-heading" : "text-foreground/40"
                }`}>
                ₹{pkg.price.toLocaleString()}
              </span>
              <p className={`text-[8px] font-mono font-black uppercase text-foreground/20 tracking-widest mt-1 transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}>
                Session yield verified
              </p>
            </div>
          </div>

          {/* Perforation visual */}
          <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-background border border-foreground/[0.05] shadow-inner -translate-y-1/2" />
          <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-background border border-foreground/[0.05] shadow-inner -translate-y-1/2" />
        </div>
      </div>

      {/* Selected top highlight */}
      {isSelected && (
        <motion.div
          layoutId="ticket-glow"
          className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent z-20"
        />
      )}
    </motion.button>
  );
};

export default TicketCard;
