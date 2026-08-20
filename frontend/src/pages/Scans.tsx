import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap, Loader2, ChevronRight, Radar } from 'lucide-react';
import { api, timeAgo, scanDuration } from '../lib/api';
import type { Scan } from '../lib/types';
import { ScanStatusBadge, GateBadge } from '../components/Badges';
import NewScanWizard from '../components/NewScanWizard';

export default function Scans() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const load = useCallback(() => {
    api<Scan[]>('/api/scans')
      .then(setScans)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setWizardOpen(true);
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  // keep running scans fresh while the list is open
  useEffect(() => {
    const hasRunning = scans.some((s) => s.status === 'running');
    if (!hasRunning) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [scans, load]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Adversarial Scans</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every run is scoped, credential-limited, and evidence-backed.
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/20 hover:brightness-110"
        >
          <Zap className="h-4 w-4" /> New Scan
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      ) : scans.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 p-16 text-center">
          <Radar className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-4 text-slate-400">No scans yet. Launch your first adversarial run.</p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-slate-600">
                  <th className="px-6 py-3.5 font-semibold">Scan</th>
                  <th className="px-4 py-3.5 font-semibold">Spec</th>
                  <th className="px-4 py-3.5 font-semibold">Env</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Findings</th>
                  <th className="px-4 py-3.5 font-semibold">Gate</th>
                  <th className="px-4 py-3.5 font-semibold">Duration</th>
                  <th className="px-4 py-3.5 font-semibold">Started</th>
                  <th className="px-4 py-3.5" />
                </tr>
              </thead>
              <tbody>
                {scans.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/scans/${s.id}`)}
                    className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.03]"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-white">{s.name}</p>
                      <p className="font-mono text-xs text-slate-600">{s.target_url}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-400">{s.spec_type}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-300">
                        {s.environment}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <ScanStatusBadge status={s.status} progress={s.progress} />
                      {s.status === 'running' && (
                        <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-cyan-400 transition-all"
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs">
                        <span className="text-rose-400">{s.critical_count}C</span>{' '}
                        <span className="text-orange-400">{s.high_count}H</span>{' '}
                        <span className="text-amber-300">{s.medium_count}M</span>{' '}
                        <span className="text-sky-400">{s.low_count}L</span>
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <GateBadge gate={s.gate_status} />
                    </td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-500">{scanDuration(s)}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{timeAgo(s.started_at)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <NewScanWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onLaunched={(id) => {
          setWizardOpen(false);
          navigate(`/scans/${id}`);
        }}
      />
    </div>
  );
}
