import { motion } from "framer-motion";
import type { SnapnPrintCategory } from "@/services/api";

interface CategoryToggleProps {
  categories: SnapnPrintCategory[];
  selected: string;
  onSelect: (id: string) => void;
}

const CategoryToggle = ({ categories, selected, onSelect }: CategoryToggleProps) => {
  return (
    <div className="flex gap-2 p-2 bg-foreground/[0.03] backdrop-blur-md rounded-2xl border border-foreground/[0.05]">
      {categories.map((cat) => {
        const isActive = selected === cat.id;

        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-4 px-4 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
              isActive ? "text-background" : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-snap-category-tab"
                className="absolute inset-0 bg-foreground shadow-lg"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-[10px] font-heading font-black tracking-[0.25em] uppercase mb-0.5">
              {cat.label}
            </span>
            <span className={`relative z-10 text-[8px] font-body font-bold tracking-[0.1em] transition-colors uppercase ${
                isActive ? "text-background/40" : "text-muted-foreground/40"
            }`}>
              {cat.id === "individual" ? "Single Archetype" : "Collective Archetype"}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryToggle;
