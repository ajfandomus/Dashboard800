import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from '@/lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const validateAllowedUser = async loggedUser => {
    if (!loggedUser?.email) return null;

    try {
      const { data, error } = await supabase.functions.invoke('check-allowed-user', {
        body: { email: loggedUser.email },
      });

      if (error || !data?.allowed) {
        await supabase.auth.signOut();
        window.location.href = '/login?error=access_denied';
        return null;
      }

      return { ...loggedUser, role: data.role || 'user' };
    } catch (err) {
      console.error('Edge function error:', err);
      await supabase.auth.signOut();
      window.location.href = '/login?error=access_denied';
      return null;
    }
  };

  useEffect(() => {
    const fallback = setTimeout(() => {
      setIsLoadingAuth(false);
    }, 8000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(fallback);

      if (!session?.user) {
        setUser(null);
        setAuthError(null);
        setIsLoadingAuth(false);
        return;
      }

      // Validate ALL events that have a user
      setIsLoadingAuth(true);
      const allowedUser = await validateAllowedUser(session.user);
      setUser(allowedUser);
      if (allowedUser) setAuthError(null);
      setIsLoadingAuth(false);
    });

    return () => {
      clearTimeout(fallback);
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