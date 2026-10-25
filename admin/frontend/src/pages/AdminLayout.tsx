import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Tag, Power, Settings, Wallet, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


const navItems = [
  { label: "Orders", icon: ShoppingBag, path: "/orders" },
  { label: "Prices", icon: Tag, path: "/prices" },
  { label: "Shop", icon: Power, path: "/shop-control" },
  { label: "Income", icon: Wallet, path: "/income" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const AdminLayout = () => {
  const { user, isLoading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
      </div>
    );
  }

  // 2. Auth Guard: If not logged in OR not an admin, show login
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 p-4 gap-1 shrink-0">
        <div className="px-3 py-4 mb-2">
          <h1 className="text-lg font-bold text-gray-900">Pozhi Admin</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500 font-medium">Live Dashboard</span>
          </div>
        </div>

        <div className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = currentPath === item.path || (item.path === "/" && item.label === "Orders");
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${active
                  ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }`}
              >
                <item.icon className={`w-[18px] h-[18px] ${active ? "text-white" : "text-gray-400"}`} strokeWidth={active ? 2 : 1.5} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-100 mt-auto">
          <div className="px-3 mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Signed in as</p>
            <p className="text-sm font-medium text-gray-900 truncate">{user.email}</p>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pb-24 md:pb-0 overflow-y-auto h-screen">
        <Outlet />
      </main>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center px-2 py-2 pb-safe z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => {
          const active = currentPath === item.path || (item.path === "/" && item.label === "Orders");
          return (
            <motion.button
              key={item.path}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors relative ${active ? "text-gray-900" : "text-gray-400"
                }`}
            >
              {active && (
                <motion.div
                  layoutId="mobile-nav-indicator"
                  className="absolute inset-0 bg-gray-100 rounded-xl -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

export default AdminLayout;