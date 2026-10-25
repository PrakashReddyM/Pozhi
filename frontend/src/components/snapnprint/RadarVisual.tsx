import { motion, AnimatePresence } from "framer-motion";
import { User, Users } from "lucide-react";
import type { SnapCategory } from "@/lib/snapnprint-data";

interface RadarVisualProps {
  category: SnapCategory;
}

const RadarVisual = ({ category }: RadarVisualProps) => {
  return (
    <div className="relative w-full h-full min-h-[480px] lg:min-h-[600px] flex flex-col items-center justify-center overflow-hidden rounded-3xl bg-surface border border-border shadow-inner">
      {/* Abstract map pattern */}
      <div className="absolute inset-0 opacity-[0.1]">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="map-grid" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.8" className="text-foreground" />
            </pattern>
            <pattern id="map-diag" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="120" y2="120" stroke="currentColor" strokeWidth="0.4" className="text-foreground" />
              <line x1="120" y1="0" x2="0" y2="120" stroke="currentColor" strokeWidth="0.4" className="text-foreground" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#map-grid)" />
          <rect width="100%" height="100%" fill="url(#map-diag)" />
        </svg>
      </div>

      {/* Radar rings */}
      <div className="relative flex items-center justify-center scale-90 sm:scale-100">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute rounded-full border border-primary/20 radar-ring"
            style={{
              width: `${(i + 1) * 80 + 40}px`,
              height: `${(i + 1) * 80 + 40}px`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}

        {/* Center icon */}
        <div className="relative z-10 w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <AnimatePresence mode="wait">
              <motion.div
                key={category}
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 30 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {category === "individual" ? (
                  <User className="w-7 h-7 text-primary-foreground" />
                ) : (
                  <Users className="w-7 h-7 text-primary-foreground" />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Hero text overlay */}
      <div className="relative z-10 mt-16 text-center px-6 pb-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-3xl md:text-4xl lg:text-5xl font-display font-extrabold text-heading tracking-tight leading-none mb-4"
        >
          WE COME TO YOU.
        </motion.h2>
        <div className="w-12 h-1 bg-primary mx-auto mb-6 rounded-full" />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-4 text-sm md:text-base text-muted-foreground max-w-sm mx-auto leading-relaxed font-medium"
        >
          Our executive will reach your location, take your pictures and deliver it to you on the spot.
        </motion.p>
      </div>
    </div>
  );
};

export default RadarVisual;

