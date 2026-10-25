import { useCallback, memo } from "react";
import { motion } from "framer-motion";
import ParallaxGallery from "./ParallaxGallery";
import { Play } from "lucide-react";

interface HeroSectionProps {
  visible: boolean;
  onEnterStudio: () => void;
}

const HeroSection = memo(({ visible, onEnterStudio }: HeroSectionProps) => {
  const handleEnterStudio = useCallback(() => {
    onEnterStudio();
  }, [onEnterStudio]);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Parallax Gallery Background — Now Light Luxe */}
      <ParallaxGallery visible={visible} />

      {/* Ambient center warm light — Subtle glow */}
      <div
        className="absolute pointer-events-none z-[5] orb bg-orange-300/5"
        style={{
          width: "800px",
          height: "800px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Typography overlay — Clean Editorial without milky blur */}
      <div className="relative z-20 text-center px-6 pointer-events-none py-12 flex flex-col items-center">
        {/* Brand Logo Anchor */}
        <div className="mb-12 opacity-100 scale-110">
        </div>

        {/* Eyebrow label removed for extreme minimalism */}

        {/* Eyebrow label removed for extreme minimalism */}

        {/* Subtext — Fine refined serif */}
        <motion.p
          initial={{ opacity: 0, filter: "blur(10px)" }}
          animate={visible ? { opacity: 1, filter: "blur(0px)" } : {}}
          transition={{ duration: 1.5, delay: 0.6, ease: "easeOut" }}
          className="text-xs md:text-sm text-foreground/40 max-w-sm mx-auto mb-10 md:mb-12 leading-[1.8] font-body uppercase tracking-[0.25em]"
        >
          An archival dedicated photography atelier crafting timeless yields with precision and soul.
        </motion.p>
      </div>

      {/* CTA Button — Solid Premium */}
      <motion.div
        className="relative z-20 pointer-events-auto"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={visible ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          onClick={handleEnterStudio}
          className="relative group px-12 py-6 rounded-full bg-foreground text-background hover:scale-105 transition-all duration-500 overflow-hidden cursor-pointer shadow-2xl shadow-black/20"
        >
          <div className="absolute inset-x-0 h-px top-0 bg-gradient-to-r from-transparent via-background/20 to-transparent group-hover:via-background/50 transition-all" />
          <span className="relative z-10 text-[10px] font-body font-black tracking-[0.4em] uppercase flex items-center gap-3">
            <Play className="w-3.5 h-3.5 fill-current" />
            Initialize Studio
          </span>
        </button>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-10 z-20 flex items-center gap-4"
        initial={{ opacity: 0, x: -30 }}
        animate={visible ? { opacity: 1, x: 0 } : {}}
        transition={{ delay: 2, duration: 1 }}
      >
        <div className="h-px w-12 bg-foreground/10" />
        <span className="text-[10px] tracking-[0.4em] uppercase text-foreground/30 font-body">
          01 // SCROLL
        </span>
      </motion.div>

      {/* Bottom gradient fade — Soft transparent highlight */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background/40 via-background/10 to-transparent z-10 pointer-events-none" />
    </section>
  );
});

HeroSection.displayName = "HeroSection";

export default HeroSection;
