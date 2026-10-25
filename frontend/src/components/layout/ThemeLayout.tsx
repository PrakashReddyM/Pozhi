import { motion } from "framer-motion";

interface ThemeLayoutProps {
  children: React.ReactNode;
}

const ThemeLayout = ({ children }: ThemeLayoutProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background">
      {/* Ambient Background Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Animated Orbs for Depth - Optimized for performance */}
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute -top-[10%] -right-[5%] w-[800px] h-[800px] rounded-full bg-orange-100/10 blur-[80px] will-change-transform"
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-blue-100/5 blur-[100px] will-change-transform"
        />
        <motion.div
          animate={{
            x: [0, 15, 0],
            y: [0, 25, 0],
          }}
          transition={{
            duration: 50,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-[-10%] right-[10%] w-[700px] h-[700px] rounded-full bg-rose-50/5 blur-[80px] will-change-transform"
        />
        
        {/* Global Grain Texture Overlay removed for performance — handled locally if needed */}
      </div>

      {/* Main Content Layer */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};

export default ThemeLayout;
