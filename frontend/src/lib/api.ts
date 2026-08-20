import supabase from './supabase';

export async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch {
    /* no session — request proceeds unauthenticated */
  }

  const res = await fetch(path, { ...init, headers });

  // Workspace APIs are protected; an expired/missing session sends the user
  // back to the login screen. Public content endpoints are excluded.
  if (res.status === 401 && !path.startsWith('/api/content')) {
    window.location.href = '/login';
    throw new Error('Session expired — redirecting to sign in');
  }

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j && j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

export const SEV_META: Record<
  string,
  { label: string; color: string; bg: string; border: string; bar: string }
> = {
  critical: {
    label: 'Critical',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/40',
    bar: '#f43f5e',
  },
  high: {
    label: 'High',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/40',
    bar: '#fb923c',
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-300',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/40',
    bar: '#fbbf24',
  },
  low: {
    label: 'Low',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/40',
    bar: '#38bdf8',
  },
};

export function cvssColor(score: number): string {
  if (score >= 9) return 'text-rose-400';
  if (score >= 7) return 'text-orange-400';
  if (score >= 4) return 'text-amber-300';
  return 'text-sky-400';
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function scanDuration(s: { started_at: string; completed_at: string | null }): string {
  const start = new Date(s.started_at).getTime();
  const end = s.completed_at ? new Date(s.completed_at).getTime() : Date.now();
  const sec = Math.max(0, Math.floor((end - start) / 1000));
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return m > 0 ? `${m}m ${r}s` : `${r}s`;
}
