import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  ShieldHalf,
  Zap,
  Mail,
  Lock,
  Loader2,
  ArrowLeft,
  FileCheck2,
  ServerCog,
  Gauge,
  KeyRound,
} from 'lucide-react';
import supabase from '../lib/supabase';
import { signInWithGoogle } from '../lib/googleAuth';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/dashboard';

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const switchMode = (m: Mode) => {
    setMode(m);
    setError('');
    setNotice('');
  };

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!validate()) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message === 'Invalid login credentials' ? 'Invalid email or password.' : err.message);
        // success → AuthContext updates `user`, redirect happens above
      } else {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) throw new Error(err.message);
        if (!data.session) {
          setNotice('Account created — check your inbox to confirm your email, then sign in.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@redteamqa.com');
    setPassword('password123');
    setMode('signin');
    setError('');
    setNotice('');
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Brand panel */}
      <div className="bg-grid relative hidden flex-col justify-between overflow-hidden border-r border-white/10 p-10 lg:flex">
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="relative">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-[#0a101c]">
              <ShieldHalf className="h-5 w-5 text-cyan-400" />
              <Zap className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-rose-500" />
            </span>
            <span className="font-display text-xl font-bold text-white">
              RedTeam <span className="text-cyan-400">QA</span>
            </span>
          </div>
          <h1 className="font-display mt-14 max-w-md text-4xl font-bold leading-tight text-white">
            The adversary is waiting <span className="text-gradient">behind this door.</span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Sign in to your workspace to launch adversarial scans, watch findings get confirmed
            with evidence, and gate your releases.
          </p>
          <ul className="mt-8 space-y-4">
            {[
              { icon: FileCheck2, t: 'Evidence-backed findings', d: 'Zero-hallucination: every issue ships with captured proof.' },
              { icon: Gauge, t: 'CVSS v3.1 + CI/CD gating', d: 'Builds fail automatically on Critical / High severity.' },
              { icon: ServerCog, t: 'Cloud or air-gapped', d: 'Multi-tenant SaaS or on-premise — your data, your perimeter.' },
            ].map((x) => (
              <li key={x.t} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <x.icon className="h-4 w-4 text-cyan-400" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{x.t}</p>
                  <p className="text-xs text-slate-500">{x.d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="relative rounded-xl border border-white/10 bg-[#04060b] p-4 font-mono text-xs leading-relaxed">
          <p className="text-slate-500">$ redqa scan --target https://staging.yourapp.dev</p>
          <p className="text-cyan-400">[recon] attack surface mapped · 5 batteries armed</p>
          <p className="text-rose-400">[CRIT] auth bypass confirmed — evidence captured</p>
          <p className="text-emerald-400">[gate] verdict compiled · report attached</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>

          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a101c] p-8">
            <div className="flex items-center gap-2 lg:hidden">
              <ShieldHalf className="h-5 w-5 text-cyan-400" />
              <span className="font-display font-bold text-white">
                RedTeam <span className="text-cyan-400">QA</span>
              </span>
            </div>

            <h2 className="font-display mt-4 text-2xl font-bold text-white lg:mt-0">
              {mode === 'signin' ? 'Sign in to your workspace' : 'Create your workspace'}
            </h2>
            <p className="mt-1.5 text-sm text-slate-500">
              {mode === 'signin'
                ? 'Continuous adversarial coverage is one scan away.'
                : 'Start testing your staging environment in minutes.'}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-[#070b13] p-1">
              <button
                onClick={() => switchMode('signin')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'signin' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode('signup')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  mode === 'signup' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-white/10 bg-[#070b13] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                  <input
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-lg border border-white/10 bg-[#070b13] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300">
                  {error}
                </div>
              )}
              {notice && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110 disabled:opacity-60"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : mode === 'signin' ? (
                  <KeyRound className="h-4 w-4" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {busy ? 'Verifying…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />
              <span className="text-xs uppercase tracking-wider text-slate-600">or</span>
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <button
              onClick={() => signInWithGoogle('RedTeam QA')}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mt-6 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Demo workspace</p>
              <p className="mt-1 font-mono text-xs text-slate-400">demo@redteamqa.com · password123</p>
              <button
                onClick={fillDemo}
                className="mt-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
              >
                Fill demo credentials
              </button>
            </div>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-slate-600">
            Protected by Supabase Auth — session tokens are verified server-side on every API call.
            <br />
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
              className="font-semibold text-cyan-400 hover:text-cyan-300"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
