import { motion } from "framer-motion";

interface CurtainTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

const CurtainTransition = ({ isActive, onComplete }: CurtainTransitionProps) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none">
      {/* Top panel */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-1/2 bg-background"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1, 1, 0] }}
        transition={{
          duration: 1.4,
          times: [0, 0.38, 0.62, 1],
          ease: [0.76, 0, 0.24, 1],
        }}
        style={{ transformOrigin: "top" }}
        onAnimationComplete={onComplete}
      />
      {/* Bottom panel */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/2 bg-background"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1, 1, 0] }}
        transition={{
          duration: 1.4,
          times: [0, 0.38, 0.62, 1],
          ease: [0.76, 0, 0.24, 1],
        }}
        style={{ transformOrigin: "bottom" }}
      />

      {/* Center brand flash */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{
          duration: 1.4,
          times: [0, 0.32, 0.68, 1],
        }}
      >
        <span className="text-foreground/90 text-2xl md:text-5xl font-royal font-black tracking-[0.5em] uppercase">
          POZHI
        </span>
      </motion.div>
    </div>
  );
};

export default CurtainTransition;
