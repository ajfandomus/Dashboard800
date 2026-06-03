import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'access_denied') {
      setErrorMsg('Access denied. Your email is not approved to use this dashboard.');
      window.history.replaceState({}, '', '/login');
    }

    // Load Playfair Display font
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    window.location.href = '/';
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
        queryParams: { prompt: 'select_account', access_type: 'offline' },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
  };

  const glamourFont = { fontFamily: "'Playfair Display', serif" };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #7B002E 0%, #4A0019 60%, #2D000F 100%)',
      }}
    >
      {/* Decorative blobs */}
      <div
        className="pointer-events-none fixed left-[-80px] top-[-80px] h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: '#ff6b9d' }}
      />
      <div
        className="pointer-events-none fixed bottom-[-60px] right-[-60px] h-72 w-72 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: '#ff2d6b' }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div
          className="w-full rounded-3xl p-8 shadow-2xl sm:p-10"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.6)',
            ...glamourFont,
          }}
        >
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5">
              <img
  src="https://www.800flower.ae/cdn/shop/files/800-flowers-logo-_-colors-1.png?v=1747173615&width=600"
  alt="800Flower Logo"
  className="h-8 w-auto object-contain sm:h-10"
/>
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl"
              style={glamourFont}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Sign in to your dashboard
            </p>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="group mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {googleLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                <span className="text-slate-500">Connecting...</span>
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.14 0 5.95 1.08 8.17 2.84l6.1-6.1C34.46 3.1 29.5 1 24 1 14.82 1 7.07 6.48 3.64 14.22l7.1 5.52C12.4 13.98 17.73 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.52 24.5c0-1.64-.15-3.22-.42-4.74H24v8.98h12.67c-.55 2.96-2.2 5.47-4.68 7.15l7.18 5.57C43.34 37.28 46.52 31.36 46.52 24.5z"/>
                  <path fill="#FBBC05" d="M10.74 28.26A14.5 14.5 0 0 1 9.5 24c0-1.48.26-2.91.74-4.26l-7.1-5.52A22.93 22.93 0 0 0 1 24c0 3.77.9 7.34 2.64 10.48l7.1-5.22z"/>
                  <path fill="#34A853" d="M24 47c5.5 0 10.12-1.82 13.5-4.94l-7.18-5.57C28.6 38.1 26.42 39 24 39c-6.27 0-11.6-4.48-13.26-10.5l-7.1 5.22C7.07 41.52 14.82 47 24 47z"/>
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="mb-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-medium uppercase tracking-widest text-slate-300">or</span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={glamourFont}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition-all duration-200 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              placeholder="Email address"
            />

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={glamourFont}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 transition-all duration-200 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
              placeholder="Password"
            />

            <button
              type="submit"
              disabled={loading || googleLoading}
              style={{
                ...glamourFont,
                background:
                  loading || googleLoading
                    ? '#9e6070'
                    : 'linear-gradient(135deg, #7B002E 0%, #9B1048 100%)',
              }}
              className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl font-semibold text-white shadow-md transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="mt-6 text-center text-xs text-rose-200 opacity-70"
          style={glamourFont}
        >
          © {new Date().getFullYear()} 800Flower. All rights reserved.
        </p>
      </div>
    </div>
  );
}