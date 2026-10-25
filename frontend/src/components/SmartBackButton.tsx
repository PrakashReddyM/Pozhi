import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const SmartBackButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  // Show on /studio, /studio/*, and /checkout
  const isSubPage =
    path.startsWith("/studio") || path === "/checkout";

  if (!isSubPage) return null;

  const handleBack = () => {
    if (path === "/checkout") {
      navigate(-1);
    } else if (path === "/studio") {
      navigate("/");
    } else {
      navigate("/studio");
    }
  };

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={handleBack}
      className="fixed top-[4.5rem] left-4 md:left-8 z-40 group"
      aria-label="Go back"
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="w-11 h-11 rounded-full glass flex items-center justify-center shadow-lg border border-border/60"
      >
        <motion.div
          className="flex items-center justify-center"
          whileHover={{ x: -2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </motion.div>
      </motion.div>
    </motion.button>
  );
};

export default SmartBackButton;
