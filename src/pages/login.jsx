import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Flower, Loader2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-pink-400"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none focus:border-pink-400"
              placeholder="••••••••"
            />
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
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