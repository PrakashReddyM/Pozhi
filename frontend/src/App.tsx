import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import ScrollToTop from "@/components/ScrollToTop";
import SmartBackButton from "@/components/SmartBackButton";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import BottomNav from "@/components/BottomNav";

import Index from "./pages/Index";
import Studio from "./pages/Studio";
import PassPhoto from "./pages/PassPhoto";
import PhotoCopies from "./pages/PhotoCopies";
import Frames from "./pages/Frames";
import SnapnPrint from "./pages/SnapnPrint";
import Album from "./pages/Album";
import Checkout from "./pages/Checkout";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Future from "./pages/Future";
import Account from "./pages/Account";
import OrderTracking from "./pages/OrderTracking";
import NotFound from "./pages/NotFound";
import ThemeLayout from "@/components/layout/ThemeLayout";

const queryClient = new QueryClient();

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Index />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/studio/passphoto" element={<PassPhoto />} />
        <Route path="/studio/photocopies" element={<PhotoCopies />} />
        <Route path="/studio/frames" element={<Frames />} />
        <Route path="/studio/snapnprint" element={<SnapnPrint />} />
        <Route path="/studio/album" element={<Album />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/future" element={<Future />} />
        <Route path="/account" element={<Account />} />
        <Route path="/login" element={<Account />} />
        <Route path="/orders/:orderNumber" element={<OrderTracking />} />

        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const NavigationWrapper = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Hide bottom nav on service pages and checkout to avoid button overlaps
  const isServicePage = location.pathname.startsWith('/studio/') && location.pathname !== '/studio';
  const isCheckoutPage = location.pathname === '/checkout';
  const showBottomNav = isAuthenticated && !isServicePage && !isCheckoutPage;
  
  return showBottomNav ? <BottomNav /> : null;
};

const App = () => {
  // Silently wake up the backend and prefetch all pricing data in the background
  // This hides Render's cold start delay and makes service pages load instantly!
  useEffect(() => {
    import("@/services/api").then(({ fetchAllPricing }) => {
      fetchAllPricing().catch((err) => console.log('Silent prefetch skipped:', err));
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <SmartBackButton />
            <ContentWrapper>
              <AnimatedRoutes />
            </ContentWrapper>
            <NavigationWrapper />
            <CartDrawer />
          </BrowserRouter>
          </CartProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const ContentWrapper = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const isServicePage = location.pathname.startsWith('/studio/') && location.pathname !== '/studio';
  const isCheckoutPage = location.pathname === '/checkout';
  
  // Only apply bottom padding if bottom nav is actually visible
  const isPortal = isAuthenticated && !isServicePage && !isCheckoutPage;

  return (
    <ThemeLayout>
      <div className={isPortal ? "pb-24 md:pb-0" : ""}>
        {children}
      </div>
    </ThemeLayout>
  );
};

export default App;
