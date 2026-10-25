import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

const PageTransition = ({ children }: PageTransitionProps) => {
  return (
    <>
      {children}

      {/* Primary curtain layer */}
      <motion.div
        className="fixed inset-0 z-[999] bg-primary origin-bottom pointer-events-none"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{
          duration: 0.4,
          ease: [0.76, 0, 0.24, 1],
        }}
        style={{ transformOrigin: "top" }}
      />

      {/* Secondary curtain layer (slight delay) */}
      <motion.div
        className="fixed inset-0 z-[998] bg-primary origin-bottom pointer-events-none"
        initial={{ scaleY: 1 }}
        animate={{ scaleY: 0 }}
        exit={{ scaleY: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.08,
          ease: [0.76, 0, 0.24, 1],
        }}
        style={{ transformOrigin: "top" }}
      />

      {/* Pozhi brand branding in center of curtain */}
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        exit={{ opacity: 1 }}
        transition={{
          duration: 0.4,
          delay: 0.15,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <span className="text-primary-foreground text-3xl md:text-5xl font-royal font-black tracking-[0.5em] uppercase">
          POZHI
        </span>
      </motion.div>
    </>
  );
};

export default PageTransition;
