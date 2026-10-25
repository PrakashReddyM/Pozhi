import { motion } from "framer-motion";

export type CopyMode = "single" | "set";

interface ModeTabsProps {
  activeTab: CopyMode;
  onTabChange: (tab: CopyMode) => void;
}

const tabs: { id: CopyMode; label: string; sub: string }[] = [
  { id: "single", label: "Single Frame", sub: "Individual Asset" },
  { id: "set", label: "Series Pack", sub: "Multi-Asset Set" },
];

const ModeTabs = ({ activeTab, onTabChange }: ModeTabsProps) => {
  return (
    <div className="flex gap-2 p-2 bg-foreground/[0.03] backdrop-blur-md rounded-2xl border border-foreground/[0.05]">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center py-4 px-4 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
              isActive ? "text-background" : "text-muted-foreground/60 hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="active-copy-mode-tab"
                className="absolute inset-0 bg-foreground shadow-lg"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
            <span className="relative z-10 text-[10px] font-heading font-black tracking-[0.25em] uppercase mb-0.5">
              {tab.label}
            </span>
            <span className={`relative z-10 text-[8px] font-body font-bold tracking-[0.1em] transition-colors uppercase ${
                isActive ? "text-background/40" : "text-muted-foreground/40"
            }`}>
              {tab.sub}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeTabs;
