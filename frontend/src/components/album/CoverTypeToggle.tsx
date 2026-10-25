import { motion } from "framer-motion";
import { Layers, Image as ImageIcon } from "lucide-react";
import type { CoverType } from "@/pages/Album";

interface CoverTypeToggleProps {
  selected: CoverType;
  onSelect: (type: CoverType) => void;
}

const CoverTypeToggle = ({ selected, onSelect }: CoverTypeToggleProps) => {
  const options = [
    { id: "basic", label: "Studio Default", icon: Layers, desc: "Linen Ivory" },
    { id: "custom", label: "Artisan Custom", icon: ImageIcon, desc: "Bespoke Visual" },
  ];

  return (
    <div className="flex gap-4 p-2 bg-foreground/[0.03] backdrop-blur-md rounded-2xl border border-foreground/[0.05]">
      {options.map((opt) => {
        const isSelected = selected === opt.id;

        return (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id as CoverType)}
            className={`relative flex-1 group p-5 text-left rounded-xl transition-all duration-500 cursor-pointer overflow-hidden ${
              isSelected ? "text-background" : "text-foreground"
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="active-cover-tab"
                className="absolute inset-0 bg-foreground rounded-xl shadow-lg"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                isSelected 
                  ? "bg-white/5 border-white/10" 
                  : "bg-foreground/5 border-foreground/5 group-hover:bg-foreground group-hover:border-foreground"
              }`}>
                <opt.icon className={`w-5 h-5 transition-colors duration-500 ${
                  isSelected ? "text-background" : "text-foreground/40 group-hover:text-background"
                }`} />
              </div>
              
              <div>
                <p className={`text-[10px] font-heading font-black uppercase tracking-[0.2em] mb-1 transition-colors ${
                    isSelected ? "text-background" : "text-heading"
                }`}>
                  {opt.label}
                </p>
                <p className={`text-[8px] font-body tracking-[0.15em] uppercase transition-colors ${
                  isSelected ? "text-background/40" : "text-muted-foreground/40"
                }`}>
                  {opt.desc}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default CoverTypeToggle;
