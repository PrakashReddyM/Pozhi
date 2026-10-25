import { motion, AnimatePresence } from "framer-motion";
import type { CoverType } from "@/pages/Album";

interface BookPreviewProps {
  isFlipped: boolean;
  coverType: CoverType;
  frontImage: string | null;
  backImage: string | null;
  onFlip: (flipped: boolean) => void;
}

const BookPreview = ({
  isFlipped,
  coverType,
  frontImage,
  backImage,
  onFlip,
}: BookPreviewProps) => {
  const showFrontCustom = coverType === "custom" && frontImage;
  const showBackCustom = coverType === "custom" && backImage;

  return (
    <div className="relative w-full aspect-square md:aspect-[4/3] flex flex-col items-center justify-center rounded-3xl bg-card border border-foreground/[0.03] overflow-hidden shadow-2xl shadow-black/[0.02]">
      {/* Archival dots background */}
      <div 
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: "radial-gradient(circle, #e5e5e5 1.5px, transparent 1px)",
          backgroundSize: "32px 32px"
        }}
      />

      {/* Book container with perspective */}
      <div
        className="relative cursor-pointer z-10"
        style={{ perspective: "2500px" }}
        onClick={() => onFlip(!isFlipped)}
      >
        <motion.div
            animate={{ 
            rotateY: isFlipped ? -180 : -15,
            rotateX: 5,
            scale: 0.95
          }}
          whileHover={{ rotateY: isFlipped ? -172 : -8, scale: 0.98 }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative"
        >
          {/* Book core */}
          <div className="relative flex" style={{ transformStyle: "preserve-3d" }}>
            
            {/* Spine — Polished Brass / Gold finish */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-orange-200 via-orange-100 to-orange-300 border-r border-black/5"
              style={{
                width: "28px",
                transform: "translateX(-14px) rotateY(90deg)",
                transformOrigin: "right center",
              }}
            />

            {/* Front cover — Ivory Linen / Canvas texture */}
            <div
              className="relative w-[240px] h-[320px] md:w-[280px] md:h-[380px] rounded-r-2xl overflow-hidden border border-black/5 shadow-[20px_10px_60px_rgba(0,0,0,0.05)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              {showFrontCustom ? (
                <img
                  src={frontImage}
                  alt="Custom front cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#FDFCFB] flex flex-col items-center justify-center p-8 relative">
                   {/* Linen Texture Overlay */}
                    <div className="absolute inset-0 opacity-[0.06] mix-blend-multiply pointer-events-none" 
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                  {/* Editorial Trim */}
                  <div className="absolute inset-5 border-[1.5px] border-foreground/[0.03] rounded-sm" />
                  
                  {/* Minimal Text Branding */}
                  <div className="mb-10 opacity-20">
                    <span className="text-foreground text-sm font-heading font-black tracking-[0.4em] uppercase">
                      POZHI
                    </span>
                  </div>
                  
                  <div className="text-center relative z-10">
                    <h4 className="text-sm font-heading font-black text-heading tracking-tight mb-2 uppercase">
                        Premium <br /> <span className="italic text-foreground/30">Volume.</span>
                    </h4>
                    <p className="text-[9px] text-muted-foreground/40 font-body font-bold tracking-[0.4em] uppercase">
                        Atelier Archive
                    </p>
                  </div>
                </div>
              )}

              {/* Finishing gloss — Soft satin */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-white/10 opacity-30 pointer-events-none" />
            </div>

            {/* Back cover */}
            <div
              className="absolute inset-0 w-[240px] h-[320px] md:w-[280px] md:h-[380px] rounded-r-2xl overflow-hidden border border-black/5 shadow-[-20px_10px_60px_rgba(0,0,0,0.05)]"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {showBackCustom ? (
                <img
                  src={backImage}
                  alt="Custom back cover"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#FDFCFB] flex flex-col items-center justify-center p-8">
                     <div className="absolute inset-0 opacity-[0.06] mix-blend-multiply pointer-events-none" 
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />

                  <div className="absolute inset-5 border border-foreground/[0.03] rounded-sm" />
                  <p className="text-[10px] text-muted-foreground/30 font-body font-bold tracking-[0.5em] uppercase mb-1">
                    Authentic
                  </p>
                  <p className="text-[9px] text-muted-foreground/20 font-mono tracking-widest uppercase">
                    Pozhi Studio © 2026
                  </p>
                </div>
              )}
              {/* Back gloss */}
              <div className="absolute inset-0 bg-gradient-to-tl from-transparent via-white/40 to-white/10 opacity-20 pointer-events-none" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Meta indicator — Editorial labels */}
      <div className="absolute bottom-10 left-0 right-0 z-20 flex flex-col items-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={isFlipped ? "back" : "front"}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex items-center gap-4"
          >
            <div className="h-px w-6 bg-foreground/10" />
            <p className="text-[10px] text-muted-foreground/60 font-body font-bold tracking-[0.5em] uppercase">
                {isFlipped ? "Posterior Yield" : "Anterior Yield"}
            </p>
            <div className="h-px w-6 bg-foreground/10" />
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center gap-3 opacity-20 group transition-opacity hover:opacity-100">
             <span className="text-[8px] text-foreground font-mono font-bold uppercase tracking-[0.15em]">Interactive Asset</span>
        </div>
      </div>
    </div>
  );
};

export default BookPreview;
