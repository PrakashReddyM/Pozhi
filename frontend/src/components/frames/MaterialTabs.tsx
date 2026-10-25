import { motion } from "framer-motion";
import type { FrameMaterial } from "@/services/api";
import { Zap, Sparkles } from "lucide-react";

interface MaterialTabsProps {
  materials: FrameMaterial[];
  selectedMaterial: string;
  onMaterialChange: (id: string) => void;
}

const MaterialTabs = ({ materials, selectedMaterial, onMaterialChange }: MaterialTabsProps) => {
  return (
    <div className="flex gap-4 p-2 bg-foreground/[0.03] backdrop-blur-md rounded-2xl border border-foreground/[0.05]">
      {materials.map((mat) => {
        const isActive = mat.id === selectedMaterial;

        return (
          <button
            key={mat.id}
            onClick={() => onMaterialChange(mat.id)}
            className={`relative flex-1 group p-5 text-left rounded-xl transition-all duration-500 cursor-pointer overflow-hidden ${
              isActive ? "text-background" : "text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-frame-material-tab"
                className="absolute inset-0 bg-foreground rounded-xl shadow-lg"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            
            <div className="relative z-10 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
                isActive 
                  ? "bg-white/5 border-white/10" 
                  : "bg-foreground/5 border-foreground/5 group-hover:bg-foreground group-hover:border-foreground"
              }`}>
                {mat.id === "glass" ? (
                    <Zap className={`w-4 h-4 transition-colors duration-500 ${
                    isActive ? "text-background" : "text-foreground/40 group-hover:text-background"
                    }`} />
                ) : (
                    <Sparkles className={`w-4 h-4 transition-colors duration-500 ${
                    isActive ? "text-background" : "text-foreground/40 group-hover:text-background"
                    }`} />
                )}
              </div>
              
              <div>
                <p className={`text-[11px] font-heading font-black uppercase tracking-[0.2em] mb-1 transition-colors ${
                    isActive ? "text-background" : "text-heading"
                }`}>
                  {mat.label}
                </p>
                <p className={`text-[9px] font-body font-bold tracking-[0.15em] uppercase transition-colors ${
                  isActive ? "text-background/40" : "text-muted-foreground/40"
                }`}>
                  {mat.id === "glass" ? "High Reflective" : "Non Reflective"}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default MaterialTabs;
