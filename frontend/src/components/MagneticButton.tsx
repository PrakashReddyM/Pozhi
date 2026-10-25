import { useRef, useState } from "react";
import { motion } from "framer-motion";

interface MagneticButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "outline";
}

const MagneticButton = ({
  children,
  onClick,
  className = "",
  variant = "primary",
}: MagneticButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouse = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current!.getBoundingClientRect();
    const x = (clientX - (left + width / 2)) * 0.28;
    const y = (clientY - (top + height / 2)) * 0.28;
    setPosition({ x, y });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const isPrimary = variant === "primary";

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.1 }}
      className="inline-block"
    >
      <motion.button
        onClick={onClick}
        whileTap={{ scale: 0.96 }}
        className={`relative overflow-hidden rounded-full cursor-pointer ${
          isPrimary
            ? "px-10 py-5 text-sm font-semibold text-primary-foreground bg-primary hover:bg-white/90 shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
            : "px-8 py-4 text-sm font-medium text-foreground border border-border hover:border-foreground/40 bg-transparent"
        } tracking-[0.12em] uppercase transition-all duration-300 ${className}`}
      >
        {/* Shimmer sweep on hover */}
        <motion.span
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={isHovered ? { x: "200%" } : { x: "-100%" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)",
          }}
        />
        {/* Glow ring pulse */}
        {isPrimary && isHovered && (
          <motion.span
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: [0, 0.3, 0], scale: [0.9, 1.15, 1.3] }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.4)" }}
          />
        )}
        <span className="relative z-10 flex items-center gap-2">{children}</span>
      </motion.button>
    </motion.div>
  );
};

export default MagneticButton;
