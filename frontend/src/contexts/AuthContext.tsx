import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import { supabase } from '@/config/supabase';
import {
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  getCurrentUser,
  refreshToken as apiRefreshToken,
  getPasskeyLoginOptions,
  verifyPasskeyLogin,
  loginWithGoogle as apiLoginWithGoogle,
  exchangeCodeForGoogleSession as apiExchangeCodeForGoogleSession,
  type AuthUser,
  type AuthSession,
} from '@/services/api';

// ==========================================
// TYPES
// ==========================================

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPasskey: (email?: string) => Promise<void>;
  loginWithGoogle: (redirectTo?: string) => Promise<string>;
  completeGoogleLogin: (code: string) => Promise<void>;
  completeGoogleLoginWithHash: (hash: string) => Promise<void>;
  signup: (data: { email: string; password: string; full_name: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

// ==========================================
// CONTEXT
// ==========================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==========================================
// TOKEN MANAGEMENT
// ==========================================

function storeSession(session: AuthSession) {
  localStorage.setItem('access_token', session.access_token);
  localStorage.setItem('refresh_token', session.refresh_token);
  localStorage.setItem('expires_at', String(session.expires_at));
}

function clearSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

function getTokenExpiresAt(): number {
  return Number(localStorage.getItem('expires_at') || '0');
}

// ==========================================
// PROVIDER
// ==========================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check existing session on mount
  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      const token = localStorage.getItem('access_token');
      if (!token) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        // Check if token is about to expire (within 5 minutes)
        const expiresAt = getTokenExpiresAt();
        const fiveMinutes = 5 * 60;
        const now = Math.floor(Date.now() / 1000);

        if (expiresAt > 0 && expiresAt - now < fiveMinutes) {
          const rt = getStoredRefreshToken();
          if (rt) {
            const { session } = await apiRefreshToken(rt);
            storeSession(session);
          }
        }

        const { user: currentUser } = await getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch {
        clearSession();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    checkAuth();
    return () => { mounted = false; };
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const rt = getStoredRefreshToken();
      const expiresAt = getTokenExpiresAt();
      const now = Math.floor(Date.now() / 1000);

      // Refresh if within 5 minutes of expiry
      if (rt && expiresAt > 0 && expiresAt - now < 300) {
        try {
          const { session } = await apiRefreshToken(rt);
          storeSession(session);
        } catch {
          clearSession();
          setUser(null);
        }
      }
    }, 60_000); // Check every minute

    return () => clearInterval(interval);
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser, session } = await apiLogin(email, password);
    storeSession(session);
    setUser(loggedInUser);
  }, []);

  const loginWithPasskey = useCallback(async (email?: string) => {
    const { options, challengeId } = await getPasskeyLoginOptions(email);
    const credential = await startAuthentication({ optionsJSON: options });
    const { user: loggedInUser, session } = await verifyPasskeyLogin(challengeId, credential);
    storeSession(session);
    setUser(loggedInUser);
  }, []);
const loginWithGoogle = useCallback(async (redirectTo?: string) => {
  // We initiate the OAuth flow from the frontend so that Supabase can set the
  // required state/PKCE cookies in the browser. This fixes "bad_oauth_state"
  // and avoids the backend's hardcoded localhost:3000 redirect defaults.
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || `${window.location.origin}/account`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
  return data.url || '';
}, []);

  const completeGoogleLogin = useCallback(async (code: string) => {
    const { user: loggedInUser, session } = await apiExchangeCodeForGoogleSession(code);
    storeSession(session);
    setUser(loggedInUser);
  }, []);

  const completeGoogleLoginWithHash = useCallback(async (hash: string) => {
    const params = new URLSearchParams(hash.replace('#', '?'));
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const expires_in = params.get('expires_in');

    if (!access_token || !refresh_token) {
      throw new Error("Invalid login URL parameters");
    }

    const expires_at = Math.floor(Date.now() / 1000) + Number(expires_in || 3600);

    storeSession({ access_token, refresh_token, expires_at });

    try {
      const { user: currentUser } = await getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      clearSession();
      setUser(null);
      throw new Error(err.message || "Authentication failed.");
    }
  }, []);

  const signup = useCallback(async (data: { email: string; password: string; full_name: string; phone?: string }) => {
    await apiSignup(data);
    // After signup, auto-login
    const { user: loggedInUser, session } = await apiLogin(data.email, data.password);
    storeSession(session);
    setUser(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, loginWithPasskey, loginWithGoogle, completeGoogleLogin, completeGoogleLoginWithHash, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ==========================================
// HOOK
// ==========================================

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
