import { useState } from "react";
import { motion } from "framer-motion";
import { Power } from "lucide-react";

const AdminShopControl = () => {
  const [isOpen, setIsOpen] = useState(true);

  const toggle = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = isOpen ? 400 : 800;
      gain.gain.value = 0.15;
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    } catch {}
    setIsOpen(!isOpen);
  };

  return (
    <div className="p-5 md:p-8 max-w-md mx-auto flex flex-col items-center justify-center min-h-[70vh]">
      {/* Status circle */}
      <motion.div
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="mb-8"
      >
        <div className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
          isOpen
            ? "border-emerald-200 bg-emerald-50 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
            : "border-gray-200 bg-gray-50"
        }`}>
          <Power
            className={`w-14 h-14 transition-colors duration-500 ${isOpen ? "text-emerald-500" : "text-gray-300"}`}
            strokeWidth={1.5}
          />
        </div>
      </motion.div>

      <h2 className="text-xl font-bold text-gray-900 mb-1">
        {isOpen ? "Shop is Open" : "Shop is Closed"}
      </h2>
      <p className="text-sm text-gray-400 mb-8 text-center">
        {isOpen ? "Customers can place orders online" : "New orders are paused"}
      </p>

      {/* Toggle switch */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={toggle}
        className={`relative w-20 h-11 rounded-full transition-colors duration-300 ${
          isOpen ? "bg-emerald-500" : "bg-gray-300"
        }`}
      >
        <motion.div
          animate={{ x: isOpen ? 36 : 4 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="absolute top-1.5 w-8 h-8 rounded-full bg-white shadow-sm"
        />
      </motion.button>
    </div>
  );
};

export default AdminShopControl;
