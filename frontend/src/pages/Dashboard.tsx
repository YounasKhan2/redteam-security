import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radar,
  Activity,
  Bug,
  AlertTriangle,
  ShieldCheck,
  Gauge,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { api, timeAgo } from '../lib/api';
import type { Stats, Scan } from '../lib/types';
import StatCard from '../components/StatCard';
import SeverityDonut from '../components/SeverityDonut';
import { ScanStatusBadge, GateBadge } from '../components/Badges';

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api<Stats>('/api/stats'), api<Scan[]>('/api/scans')])
      .then(([s, sc]) => {
        setStats(s);
        setScans(sc);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-rose-400">Could not load dashboard: {error || 'unknown error'}</p>
      </div>
    );
  }

  const critHighOpen = stats.by_severity.critical + stats.by_severity.high;
  const maxCat = Math.max(1, ...stats.by_category.map((c) => c.count));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Security QA Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Continuous adversarial coverage across your staging estate.
          </p>
        </div>
        <Link
          to="/scans?new=1"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
        >
          <Radar className="h-4 w-4" /> New Scan
        </Link>
      </div>

      {scans.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
          <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Connected target
          </span>
          <span className="font-mono text-sm text-white">{scans[0].target_url}</span>
          <span className="text-xs text-slate-500">
            last sweep {timeAgo(scans[0].started_at)} · {scans[0].status}
          </span>
          <Link
            to={`/scans/${scans[0].id}`}
            className="ml-auto inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
          >
            View run <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard icon={Radar} label="Total Scans" value={String(stats.total_scans)} sub="all time" />
        <StatCard
          icon={Activity}
          label="Running Now"
          value={String(stats.running_scans)}
          sub="live runners"
          accent="text-cyan-300"
        />
        <StatCard
          icon={Bug}
          label="Open Findings"
          value={String(stats.open_findings)}
          sub={`${stats.total_findings} confirmed total`}
          accent="text-amber-300"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical + High"
          value={String(critHighOpen)}
          sub="open, gate-blocking"
          accent="text-rose-400"
        />
        <StatCard
          icon={ShieldCheck}
          label="Gate Pass Rate"
          value={`${stats.gate_pass_rate}%`}
          sub="completed scans"
          accent="text-emerald-400"
        />
        <StatCard
          icon={Gauge}
          label="Avg CVSS (Open)"
          value={stats.avg_cvss.toFixed(1)}
          sub="risk-weighted"
          accent="text-violet-400"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#0a101c] p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Open Findings by Severity
          </h3>
          <div className="mt-6 flex justify-center">
            <SeverityDonut counts={stats.by_severity} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a101c] p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Open Findings by Attack Battery
          </h3>
          <div className="mt-6 space-y-4">
            {stats.by_category.length === 0 && <p className="text-sm text-slate-600">No open findings.</p>}
            {stats.by_category.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-400">{c.category}</span>
                  <span className="font-mono font-semibold text-white">{c.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-rose-500"
                    style={{ width: `${(c.count / maxCat) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 border-t border-white/5 pt-4 font-mono text-xs text-slate-600">
            false positives eliminated: {stats.dismissed_findings} · rate {stats.false_positive_rate}%
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a101c] p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Latest Confirmed</h3>
            <Link to="/findings" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
              All findings <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {stats.recent_findings.slice(0, 4).map((f) => (
              <Link
                key={f.id}
                to="/findings"
                className="block rounded-xl border border-white/10 bg-[#070b13] p-3 transition hover:border-white/25"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      f.severity === 'critical'
                        ? 'bg-rose-500/15 text-rose-400'
                        : f.severity === 'high'
                          ? 'bg-orange-500/15 text-orange-400'
                          : f.severity === 'medium'
                            ? 'bg-amber-400/15 text-amber-300'
                            : 'bg-sky-500/15 text-sky-400'
                    }`}
                  >
                    {f.severity}
                  </span>
                  <span className="font-mono text-[10px] text-slate-600">{timeAgo(f.discovered_at)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-slate-200">
                  {f.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-[#0a101c]">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Scans</h3>
          <Link to="/scans" className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300">
            Scan history <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-slate-600">
                <th className="px-6 py-3 font-semibold">Scan</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Findings</th>
                <th className="px-4 py-3 font-semibold">Gate</th>
                <th className="px-4 py-3 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody>
              {scans.slice(0, 6).map((s) => (
                <tr
                  key={s.id}
                  onClick={() => (window.location.href = `/scans/${s.id}`)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-6 py-3.5">
                    <p className="font-semibold text-white">{s.name}</p>
                    <p className="font-mono text-xs text-slate-600">{s.target_url}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <ScanStatusBadge status={s.status} progress={s.progress} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-xs">
                      <span className="text-rose-400">{s.critical_count}C</span>{' '}
                      <span className="text-orange-400">{s.high_count}H</span>{' '}
                      <span className="text-amber-300">{s.medium_count}M</span>{' '}
                      <span className="text-sky-400">{s.low_count}L</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <GateBadge gate={s.gate_status} />
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">{timeAgo(s.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
