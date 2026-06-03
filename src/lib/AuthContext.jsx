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
    return { ...loggedUser, role: 'admin' };
  };

  useEffect(() => {
    const fallback = setTimeout(() => {
      setIsLoadingAuth(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      clearTimeout(fallback);

      if (_event === 'TOKEN_REFRESHED' || _event === 'INITIAL_SESSION') {
        if (!session?.user) {
          setUser(null);
          setIsLoadingAuth(false);
        } else {
          setUser({ ...session.user, role: 'admin' });
          setIsLoadingAuth(false);
        }
        return;
      }

      if (!session?.user) {
        setUser(null);
        setAuthError(null);
        setIsLoadingAuth(false);
        return;
      }

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