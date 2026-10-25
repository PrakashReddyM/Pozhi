import { motion } from "framer-motion";
import { Package, MessageCircle, User, Image } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Home", isLogo: true, path: "/" },
  { label: "Support", icon: MessageCircle, path: "/contact" },
  { label: "Orders", icon: Package, path: "/account", tab: "orders" },
  { label: "Profile", icon: User, path: "/account", tab: "updates" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get("tab");

  const isActive = (path: string, tab?: string) => {
    if (path === "/") return location.pathname === "/";
    if (location.pathname.startsWith(path)) {
      if (tab) return currentTab === tab;
      return !currentTab || currentTab === "orders"; // Default to orders if no tab
    }
    return false;
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-foreground/[0.05] flex justify-around items-center px-2 py-2 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]"
    >
      {navItems.map((item) => {
        const active = isActive(item.path, item.tab);
        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(item.tab ? `${item.path}?tab=${item.tab}` : item.path)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors relative ${
                active ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {active && (
              <motion.div
                layoutId="mobile-nav-indicator"
                className="absolute inset-0 bg-foreground/[0.05] rounded-xl -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            {item.isLogo ? (
              <img src="/favicon.ico" alt="Home" className={`w-6 h-6 object-contain ${active ? "opacity-100" : "opacity-40 grayscale"}`} />
            ) : item.icon ? (
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 1.5} />
            ) : null}

            <span className={`text-[10px] font-medium tracking-tight ${active ? "font-bold" : ""}`}>
                {item.label}
            </span>
          </motion.button>
        );
      })}
    </motion.nav>
  );
};

export default BottomNav;
