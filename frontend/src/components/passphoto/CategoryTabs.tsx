import { motion } from "framer-motion";
import type { PassPhotoCategory } from "@/services/api";

interface CategoryTabsProps {
  categories: PassPhotoCategory[];
  selectedCategoryId: string;
  onCategoryChange: (id: string) => void;
}

const CategoryTabs = ({ categories, selectedCategoryId, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="flex gap-2 p-2 bg-foreground/[0.03] backdrop-blur-md rounded-2xl border border-foreground/[0.05]">
      {categories.map((cat) => {
        const isActive = cat.id === selectedCategoryId;

        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={`relative flex-1 px-4 py-4 text-[10px] font-body font-black tracking-[0.2em] uppercase rounded-xl transition-all duration-300 cursor-pointer ${
              isActive ? "text-background" : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-category-tab"
                className="absolute inset-0 bg-foreground rounded-xl shadow-lg ring-1 ring-foreground/20"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default CategoryTabs;
