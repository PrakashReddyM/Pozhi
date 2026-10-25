import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const words = ["MEMORIES", "LIFE", "ART", "STORIES"];

const AnimatedText = ({ visible }: { visible: boolean }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2600);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <span className="inline-block relative">
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 50, filter: "blur(12px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -40, filter: "blur(8px)" }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block text-gradient"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default AnimatedText;
