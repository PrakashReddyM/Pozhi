import { motion } from "framer-motion";
import type { AlbumCapacity } from "@/services/api";

interface CapacitySelectorProps {
  capacities: AlbumCapacity[];
  selectedId: string;
  onSelect: (cap: AlbumCapacity) => void;
}

const CapacitySelector = ({ capacities, selectedId, onSelect }: CapacitySelectorProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {capacities.map((cap, i) => {
        const isSelected = selectedId === cap.id;

        return (
          <motion.button
            key={cap.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onSelect(cap)}
            className={`group relative p-6 rounded-2xl border transition-all duration-700 text-center cursor-pointer ${
              isSelected
                ? "border-foreground bg-foreground text-background shadow-2xl shadow-black/[0.05]"
                : "border-foreground/5 bg-foreground/[0.01] hover:border-foreground/20 hover:bg-foreground/[0.03] text-foreground"
            }`}
          >
            <div className="relative z-10">
              <span className={`block text-3xl font-heading font-black mb-1 transition-colors ${
                isSelected ? "text-background" : "text-heading"
              }`}>
                {cap.images}
              </span>
              <p className={`text-[10px] font-body font-bold uppercase tracking-[0.2em] opacity-40 transition-colors ${
                isSelected ? "text-background/60" : "text-muted-foreground"
              }`}>
                Portraits
              </p>
            </div>

            {/* Price reveal on selection */}
            <div className={`absolute top-2 right-2 px-2 py-1 rounded-lg border border-white/10 bg-white/5 transition-opacity duration-500 ${
                isSelected ? "opacity-100" : "opacity-0"
            }`}>
                 <span className="text-[8px] font-mono font-bold text-background/80">₹{cap.price}</span>
            </div>

             {/* Selected bloom */}
            {isSelected && (
              <motion.div
                layoutId="cap-selected-indicator"
                className="absolute inset-0 bg-foreground rounded-2xl -z-0"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};

export default CapacitySelector;
