import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]               = useState(null);
  const [isLoadingAuth, setIsLoading] = useState(true);
  const [authError, setAuthError]     = useState(null);

  const validatingRef  = useRef(false);
  const initializedRef = useRef(false); // has the first session check resolved?

  // ── validate against allowed_users table ──────────────────────────────
  const validateAllowedUser = async (loggedUser) => {
    if (!loggedUser?.email) return null;
    try {
      const { data, error } = await supabase
        .from('allowed_users')
        .select('email, role')
        .ilike('email', loggedUser.email)
        .maybeSingle();

      if (error || !data) {
        await supabase.auth.signOut();
        window.location.href = '/login?error=access_denied';
        return null;
      }
      return { ...loggedUser, role: data.role || 'user' };
    } catch {
      await supabase.auth.signOut();
      window.location.href = '/login?error=access_denied';
      return null;
    }
  };

  // ── handle a session object (shared by both paths) ────────────────────
  const handleSession = async (session, { cancelled }) => {
    if (cancelled.value) return;

    if (!session?.user) {
      setUser(null);
      setAuthError(null);
      setIsLoading(false);
      return;
    }

    // guard against concurrent calls
    if (validatingRef.current) return;
    validatingRef.current = true;
    setIsLoading(true);

    try {
      const allowedUser = await validateAllowedUser(session.user);
      if (cancelled.value) return;
      setUser(allowedUser);
      if (allowedUser) setAuthError(null);
    } catch {
      if (!cancelled.value) {
        setUser(null);
        setAuthError('Authentication failed. Please try again.');
      }
    } finally {
      validatingRef.current = false;
      if (!cancelled.value) setIsLoading(false);
    }
  };

  useEffect(() => {
    const cancelled = { value: false };

    // ── FAST PATH: check existing session immediately on mount ──────────
    // This runs in parallel with onAuthStateChange and guarantees the
    // spinner clears even if the subscription callback is delayed/skipped.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled.value || initializedRef.current) return;
      initializedRef.current = true;
      handleSession(session, { cancelled });
    });

    // ── SAFETY NET: if nothing resolves in 8 seconds, stop spinning ─────
    const timeout = setTimeout(() => {
      if (!initializedRef.current && !cancelled.value) {
        console.warn('[Auth] Session check timed out — clearing spinner');
        setIsLoading(false);
        initializedRef.current = true;
      }
    }, 8000);

    // ── SUBSCRIPTION: handles sign-in / sign-out events after load ──────
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (cancelled.value) return;

        // If getSession already resolved first, skip the INITIAL_SESSION
        // event to avoid a double-validate race
        if (initializedRef.current && _event === 'INITIAL_SESSION') return;

        initializedRef.current = true;
        clearTimeout(timeout);
        handleSession(session, { cancelled });
      }
    );

    return () => {
      cancelled.value = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        authChecked: !isLoadingAuth,
        logout,
        navigateToLogin: () => { window.location.href = '/login'; },
        checkUserAuth: () => {},
        checkAppState: () => {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};