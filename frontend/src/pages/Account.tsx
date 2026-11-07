import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LogOut, User, Loader2, Package, Bell, FileText, ChevronRight, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { fetchUserOrders, type Order } from "@/services/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_BASE_URL = BACKEND_URL.endsWith('/api/v1') ? BACKEND_URL : `${BACKEND_URL}/api/v1`;

const Account = () => {
  const { user, isAuthenticated, isLoading, login, signup, loginWithGoogle, completeGoogleLogin, completeGoogleLoginWithHash, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "orders";
  const [error, setError] = useState<string | null>(null);

  // Auth form state
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');

    if (hash && hash.includes("access_token")) {
      completeGoogleLoginWithHash(hash)
        .then(() => {
          // Check if user is admin and redirect
          // We'll let the other useEffect handle the actual redirection
          navigate("/account");
        })
        .catch((err: any) => {
          setError(err.message || "Google login failed");
        });
    } else if (code) {
      completeGoogleLogin(code, `${window.location.origin}/account`)
        .then(() => {
          navigate("/account");
        })
        .catch((err: any) => {
          setError(err.message || "Google login failed");
        });
    }

    const errorParam = searchParams.get("error_description") || searchParams.get("error");
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [completeGoogleLogin, completeGoogleLoginWithHash, navigate, searchParams]);

  // Redirect admin users to the admin portal (COMMENTED OUT TO PREVENT FORCED REDIRECT)
  // useEffect(() => {
  //   if (isAuthenticated && user?.role === 'admin') {
  //     const adminUrl = window.location.hostname.includes('admin') 
  //       ? window.location.origin 
  //       : 'https://admin.pozhi.in';
  //     
  //     if (!window.location.hostname.includes('admin')) {
  //       window.location.href = `${adminUrl}/login${window.location.hash}`;
  //     }
  //   }
  // }, [isAuthenticated, user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoadingOrders(true);
      fetchUserOrders()
        .then(data => {
            // Sort by latest
            const sorted = (data || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setOrders(sorted);
        })
        .catch(err => console.error("Failed to fetch orders:", err))
        .finally(() => setLoadingOrders(false));
    }
  }, [isAuthenticated, user]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setError(null);
    try {
      if (authMode === 'signin') {
        await login(authEmail, authPassword);
      } else {
        await signup({ email: authEmail, password: authPassword, full_name: authName });
        await login(authEmail, authPassword);
      }
      navigate('/account');
    } catch (err: any) {
      setError(err.message || (authMode === 'signin' ? 'Login failed' : 'Sign up failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // Pass current origin as redirectTo so backend knows where to send the user back
      const redirectTo = `${window.location.origin}/account`;
      const url = await loginWithGoogle(redirectTo);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Failed to start Google login");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
      case 'processing':
      case 'shipped': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'confirmed': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelled':
      case 'refunded': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const ACTIVE_STATUSES = ['pending', 'confirmed', 'processing', 'shipped'];
  const isActive = (o: Order) => ACTIVE_STATUSES.includes((o.order_status || '').toLowerCase());
  const activeOrders = orders.filter(isActive);
  const pastOrders = orders.filter((o) => !isActive(o));
  const firstThumb = (o: Order) =>
    o.order_items?.find((i) => i.user_uploads?.storage_url)?.user_uploads?.storage_url;

  if (isLoading) {
    return (
      <>
        <Navbar visible={true} />
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Navbar visible={true} />
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="min-h-screen pt-24 pb-32 px-4 md:px-8 lg:px-12 flex flex-col items-center justify-center bg-background"
        >
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-lg p-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-display font-extrabold text-heading">
                {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {authMode === 'signin'
                  ? 'Login to access your orders, saved designs, and updates.'
                  : 'Join Pozhi to start ordering prints and frames.'}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-3">
              {authMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={e => setAuthName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={authPassword}
                    onChange={e => setAuthPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pr-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {authLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </motion.button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white border border-gray-200 text-gray-900 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </motion.button>

            <p className="text-center text-sm text-muted-foreground mt-5">
              {authMode === 'signin' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => { setAuthMode('signup'); setError(null); }} className="text-primary font-medium hover:underline">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => { setAuthMode('signin'); setError(null); }} className="text-primary font-medium hover:underline">
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </motion.main>
      </>
    );
  }

  // Dashboard View
  return (
    <>
      <Navbar visible={true} />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen pt-24 pb-40 px-4 md:px-8 flex justify-center bg-[#F8F9FA]"
      >
        <div className="w-full max-w-5xl">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar / Profile Card - Always visible on PC */}
                <div className="w-full md:w-80 shrink-0">
                    <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 sticky top-28">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-24 h-24 rounded-full overflow-hidden shadow-md">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary flex items-center justify-center">
                                        <span className="text-2xl font-bold text-white select-none">
                                            {(user?.full_name || user?.email || 'U').charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div className="pb-2">
                                <h2 className="text-xl font-bold text-gray-900 leading-tight">{user?.full_name || "User"}</h2>
                                <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
                            </div>
                            
                            {/* Navigation Tabs (Sidebar version for PC) */}
                            <div className="w-full pt-2 space-y-1">
                                <button 
                                    onClick={() => setSearchParams({ tab: "orders" })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentTab === "orders" ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-gray-600 hover:bg-gray-50 font-medium"}`}
                                >
                                    <Package className={`w-4 h-4 ${currentTab === "orders" ? "text-white" : "text-gray-400"}`} />
                                    Order History
                                </button>
                                <button 
                                    onClick={() => setSearchParams({ tab: "updates" })}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${currentTab === "updates" ? "bg-primary text-white font-bold shadow-lg shadow-primary/20" : "text-gray-600 hover:bg-gray-50 font-medium"}`}
                                >
                                    <Bell className={`w-4 h-4 ${currentTab === "updates" ? "text-white" : "text-gray-400"}`} />
                                    Latest Updates
                                </button>
                            </div>

                            <div className="w-full pt-6 border-t border-gray-100">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-red-50 hover:text-red-600 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0">
                    {currentTab === "updates" ? (
                        /* Updates View */
                        <div className="space-y-6">
                            <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
                                <h3 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                                    <Bell className="w-6 h-6 text-primary" />
                                    Latest Updates
                                </h3>
                                
                                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-green-100 text-green-600 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                            <Bell className="w-4 h-4" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-2xl border border-gray-100 bg-white shadow-sm">
                                            <div className="flex items-center justify-between space-x-2 mb-1">
                                                <div className="font-bold text-gray-900">Welcome to Pozhi!</div>
                                                <time className="font-mono text-xs font-medium text-primary">Now</time>
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                Our new digital storefront is officially live. Explore our services and place your first order.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 rounded-3xl p-8 text-center">
                                <h4 className="font-bold text-gray-900 mb-2">Need Assistance?</h4>
                                <p className="text-sm text-gray-600 mb-6">Our professional support team is ready to help you with your designs.</p>
                                <button 
                                    onClick={() => navigate('/contact')}
                                    className="px-8 py-3 bg-white text-primary font-bold rounded-xl border border-primary/10 hover:shadow-md transition-all"
                                >
                                    Contact Support
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Orders View */
                        <div className="bg-white border border-gray-100 rounded-3xl shadow-sm p-6 md:p-8">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                                    <Package className="w-6 h-6 text-primary" />
                                    Your Order History
                                </h3>
                                {orders.length > 0 && (
                                    <span className="px-4 py-1.5 bg-gray-50 text-gray-500 text-xs font-bold rounded-full border border-gray-100">
                                        {orders.length} Total Orders
                                    </span>
                                )}
                            </div>

                            {loadingOrders ? (
                                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                                    <p className="font-medium">Syncing your orders...</p>
                                </div>
                            ) : orders.length === 0 ? (
                                <div className="py-20 flex flex-col items-center justify-center text-center">
                                    <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                        <Package className="w-12 h-12 text-gray-300" />
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-900">No orders found</h4>
                                    <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                                        You haven't placed any orders yet. Visit our studio to start your first project!
                                    </p>
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => navigate('/studio')}
                                        className="mt-8 px-10 py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all"
                                    >
                                        Browse Our Studio
                                    </motion.button>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Active orders — the ones customers come here to check */}
                                    {activeOrders.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-3">
                                                In Progress ({activeOrders.length})
                                            </p>
                                            <div className="space-y-3">
                                                {activeOrders.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        onClick={() => navigate(`/orders/${order.order_number}`)}
                                                        className="flex items-center gap-4 border border-gray-100 rounded-2xl p-4 bg-white hover:shadow-md hover:border-primary/20 transition-all cursor-pointer"
                                                    >
                                                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                                                            {firstThumb(order) ? (
                                                                <img src={firstThumb(order)} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-5 h-5 text-gray-300" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(order.order_status)}`}>
                                                                    {order.order_status}
                                                                </span>
                                                                <span className="text-[10px] font-mono text-gray-400 truncate">
                                                                    #{order.order_number}
                                                                </span>
                                                            </div>
                                                            <h4 className="text-base font-bold text-gray-900 truncate">{order.service_type}</h4>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {format(new Date(order.created_at), 'd MMM yyyy')} · {order.order_items?.length || 0} item{(order.order_items?.length || 0) === 1 ? '' : 's'}
                                                            </p>
                                                        </div>

                                                        <div className="text-right flex-shrink-0">
                                                            <p className="text-lg font-black text-gray-900 tabular-nums">₹{order.total_amount}</p>
                                                            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary mt-0.5">
                                                                Track <ChevronRight className="w-3 h-3" />
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Past orders — compact rows */}
                                    {pastOrders.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 mb-1">
                                                Past Orders ({pastOrders.length})
                                            </p>
                                            <div className="divide-y divide-gray-100">
                                                {pastOrders.map((order) => (
                                                    <div
                                                        key={order.id}
                                                        onClick={() => navigate(`/orders/${order.order_number}`)}
                                                        className="flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 flex items-center justify-center">
                                                            {firstThumb(order) ? (
                                                                <img src={firstThumb(order)} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package className="w-4 h-4 text-gray-300" />
                                                            )}
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-bold text-gray-900 truncate">{order.service_type}</p>
                                                            <p className="text-[11px] text-gray-400 truncate font-mono">
                                                                #{order.order_number} · {format(new Date(order.created_at), 'd MMM yyyy')}
                                                            </p>
                                                        </div>

                                                        <span className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border flex-shrink-0 ${getStatusColor(order.order_status)}`}>
                                                            {order.order_status}
                                                        </span>

                                                        <p className="text-sm font-black text-gray-900 tabular-nums w-16 text-right flex-shrink-0">
                                                            ₹{order.total_amount}
                                                        </p>
                                                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </motion.main>
    </>
  );
};

export default Account;