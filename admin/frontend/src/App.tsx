import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";

// Pages
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./pages/AdminLayout";
import AdminOrders from "./pages/AdminOrders";
import AdminPrices from "./pages/AdminPrices";
import AdminSettings from "./pages/AdminSettings";
import AdminIncome from "./pages/AdminIncome";
import AdminShopControl from "./pages/AdminShopControl";

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider> {/* We need to ensure AuthProvider is compatible or create a simplified one for Admin */}
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<AdminLogin />} />

                        {/* Protected Routes */}
                        <Route path="/" element={<AdminLayout />}>
                            <Route index element={<Navigate to="/orders" replace />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="prices" element={<AdminPrices />} />
                            <Route path="income" element={<AdminIncome />} />
                            <Route path="shop-control" element={<AdminShopControl />} />
                            <Route path="settings" element={<AdminSettings />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                    <Toaster />
                </BrowserRouter>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;
