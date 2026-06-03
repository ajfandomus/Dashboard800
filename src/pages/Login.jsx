import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Flower, Loader2 } from 'lucide-react';

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
      // Clean the URL
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  const handleLogin = async e => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 via-white to-rose-50 p-4">
      <div className="w-full max-w-md rounded-[2rem] border border-pink-100 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-100 text-pink-600">
            <Flower className="h-7 w-7" />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            800Flower Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to continue
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="mb-4 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {googleLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Connecting Google...
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-blue-500">G</span>
              Continue with Google
            </>
          )}
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-medium text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-pink-400"
            placeholder="Email"
          />

          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-pink-400"
            placeholder="Password"
          />

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-slate-900 font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
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
    </div>
  );
}