import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingCart, User, Menu } from "lucide-react";
import MobileMenu from "./MobileMenu";
import SearchModal from "./SearchModal";
import logoImg from "@/assets/logo-original.png";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

export const navLinks = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/studio" },
  { label: "Print Now", path: "/studio/photocopies" },
  { label: "Frames", path: "/studio/frames" },
  { label: "Mini Albums", path: "/studio/album" },
  { label: "About", path: "/about" },
];

interface NavbarProps {
  visible?: boolean;
}

const Navbar = ({ visible = true }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { count, openCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const firstName = user?.full_name?.trim().split(/\s+/)[0];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!visible) return null;

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    // Exact match for sub-paths to avoid double-highlighting
    return location.pathname === path;
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white transition-shadow duration-200 ${
          scrolled ? "shadow-sm" : "border-b border-gray-100"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-16">

          {/* Logo */}
          <button
            className="flex items-center gap-2.5 flex-shrink-0"
            onClick={() => navigate("/")}
            aria-label="Go to homepage"
          >
            <img
              src={logoImg}
              alt="Pozhi"
              className="h-9 w-9 object-contain rounded-lg"
            />
            <div className="text-left hidden sm:block">
              <div className="text-blue-600 font-bold text-lg leading-none tracking-tight">
                pozhi
              </div>
              <div className="text-gray-400 text-[10px] tracking-wide">
                Print · Frame · Preserve
              </div>
            </div>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`relative pb-0.5 font-medium transition-colors whitespace-nowrap ${
                  isActive(link.path)
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                {link.label}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* Right: search, cart, account */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
            <button
              onClick={openCart}
              className="relative p-2 text-gray-500 hover:text-blue-600 transition-colors"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={18} />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
            <button
              className="hidden sm:flex items-center gap-1.5 bg-gray-900 text-white text-sm px-4 py-2 rounded-full hover:bg-blue-600 transition-colors ml-1 max-w-[140px]"
              onClick={() => navigate("/account")}
            >
              <User size={13} className="flex-shrink-0" />
              <span className="truncate">{isAuthenticated && firstName ? firstName : "My Account"}</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-gray-600 ml-1"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
};

export default Navbar;
