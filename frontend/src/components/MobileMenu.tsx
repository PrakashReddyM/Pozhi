import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { navLinks } from "./Navbar";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const MobileMenu = ({ isOpen, onClose }: MobileMenuProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = (path: string) => {
    onClose();
    setTimeout(() => navigate(path), 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: "100%" }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: "100%" }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[200] bg-white flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-16 border-b border-gray-100">
            <span className="text-blue-600 font-bold text-xl">pozhi</span>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* Links */}
          <nav className="flex flex-col py-4 flex-1">
            {navLinks.map((link, i) => (
              <motion.button
                key={link.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                onClick={() => handleClick(link.path)}
                className={`text-left px-6 py-4 text-base font-medium border-b border-gray-50 transition-colors ${
                  location.pathname === link.path
                    ? "text-blue-600 bg-blue-50"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {link.label}
              </motion.button>
            ))}
          </nav>

          {/* Account button */}
          <div className="px-6 pb-8 pt-2">
            <button
              className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-3.5 rounded-full font-semibold hover:bg-blue-600 transition-colors"
              onClick={() => handleClick("/account")}
            >
              <User size={16} />
              My Account
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
