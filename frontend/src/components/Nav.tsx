import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShieldHalf, Menu, X, Zap, LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';

const ANCHORS = [
  { label: 'Capabilities', to: '/#capabilities' },
  { label: 'Workflow', to: '/#workflow' },
  { label: 'Deployment', to: '/#deployment' },
  { label: 'Roadmap', to: '/#roadmap' },
];

const PAGES = [
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Scans', to: '/scans' },
  { label: 'Findings', to: '/findings' },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await supabase.auth.signOut();
    setOpen(false);
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#0a101c]">
            <ShieldHalf className="h-5 w-5 text-cyan-400" />
            <Zap className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-rose-500" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-white">
            RedTeam <span className="text-cyan-400">QA</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {ANCHORS.map((a) => (
            <Link
              key={a.to}
              to={a.to}
              className="rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              {a.label}
            </Link>
          ))}
          {user && (
            <>
              <span className="mx-2 h-5 w-px bg-white/10" />
              {PAGES.map((p) => (
                <NavLink
                  key={p.to}
                  to={p.to}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm transition ${
                      isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  {p.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {user ? (
            <>
              <span
                className="inline-flex max-w-[200px] items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300"
                title={user.email || 'Signed in'}
              >
                <UserCircle2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">{user.email}</span>
              </span>
              <Link
                to="/scans?new=1"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                <Zap className="h-4 w-4" /> Launch Scan
              </Link>
              <button
                onClick={signOut}
                className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                Sign in
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:brightness-110"
              >
                <Zap className="h-4 w-4" /> Get Started
              </Link>
            </>
          )}
        </div>

        <button
          className="ml-auto rounded-lg border border-white/10 p-2 text-slate-300 lg:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#070b13] px-4 py-4 lg:hidden">
          <div className="flex flex-col gap-1">
            {ANCHORS.map((a) => (
              <Link
                key={a.to}
                to={a.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
              >
                {a.label}
              </Link>
            ))}
            {user ? (
              <>
                {PAGES.map((p) => (
                  <Link
                    key={p.to}
                    to={p.to}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
                  >
                    {p.label}
                  </Link>
                ))}
                <Link
                  to="/scans?new=1"
                  onClick={() => setOpen(false)}
                  className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
                >
                  <Zap className="h-4 w-4" /> Launch Scan
                </Link>
                <button
                  onClick={signOut}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  <LogOut className="h-4 w-4" /> Sign out {user.email ? `(${user.email})` : ''}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950"
              >
                <Zap className="h-4 w-4" /> Sign in / Get Started
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
