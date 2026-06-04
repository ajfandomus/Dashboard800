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
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Prevent overlapping validateAllowedUser calls
  const validatingRef = useRef(false);

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
    } catch (err) {
      await supabase.auth.signOut();
      window.location.href = '/login?error=access_denied';
      return null;
    }
  };

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (cancelled) return;

      // If already validating, skip duplicate fires
      if (validatingRef.current) return;

      if (!session?.user) {
        setUser(null);
        setAuthError(null);
        setIsLoadingAuth(false);
        return;
      }

      validatingRef.current = true;
      setIsLoadingAuth(true);

      try {
        const allowedUser = await validateAllowedUser(session.user);

        if (cancelled) return;

        setUser(allowedUser);
        if (allowedUser) setAuthError(null);
      } catch (err) {
        if (!cancelled) {
          setUser(null);
          setAuthError('Authentication failed. Please try again.');
        }
      } finally {
        validatingRef.current = false;
        if (!cancelled) {
          setIsLoadingAuth(false);
        }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navigateToLogin = () => {
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
        navigateToLogin,
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
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};