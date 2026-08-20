import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Finding, Scan } from '../lib/types';
import { SeverityBadge, FindingStatusBadge } from '../components/Badges';
import FindingDrawer from '../components/FindingDrawer';

const SEVERITIES = ['all', 'critical', 'high', 'medium', 'low'];
const STATUSES = ['all', 'open', 'in_review', 'fixed', 'dismissed'];

export default function Findings() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [severity, setSeverity] = useState('all');
  const [status, setStatus] = useState('all');
  const [scanId, setScanId] = useState('all');
  const [query, setQuery] = useState('');
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);

  const load = useCallback(() => {
    Promise.all([api<Finding[]>('/api/findings'), api<Scan[]>('/api/scans')])
      .then(([f, s]) => {
        setFindings(f);
        setScans(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const scanName = useMemo(() => {
    const m: Record<number, string> = {};
    scans.forEach((s) => (m[s.id] = s.name));
    return m;
  }, [scans]);

  const sevCounts = useMemo(() => {
    const c: Record<string, number> = { all: findings.length, critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach((f) => (c[f.severity] = (c[f.severity] || 0) + 1));
    return c;
  }, [findings]);

  const filtered = useMemo(() => {
    return findings.filter((f) => {
      if (severity !== 'all' && f.severity !== severity) return false;
      if (status !== 'all' && f.status !== status) return false;
      if (scanId !== 'all' && f.scan_id !== Number(scanId)) return false;
      if (query && !`${f.title} ${f.endpoint} ${f.cwe}`.toLowerCase().includes(query.toLowerCase()))
        return false;
      return true;
    });
  }, [findings, severity, status, scanId, query]);

  const setFindingStatus = async (fid: number, newStatus: string) => {
    await api('/api/findings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fid, status: newStatus }),
    });
    setFindings((prev) => prev.map((f) => (f.id === fid ? { ...f, status: newStatus } : f)));
    setDrawerFinding((d) => (d && d.id === fid ? { ...d, status: newStatus } : d));
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Findings Explorer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every entry is evidence-backed: reproduced, captured, and verified by the runner.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title, endpoint, CWE…"
            className="w-72 rounded-lg border border-white/10 bg-[#0a101c] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverity(s)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                severity === s
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-white/10 bg-[#0a101c] text-slate-500 hover:text-slate-300'
              }`}
            >
              {s} <span className="opacity-60">({sevCounts[s] || 0})</span>
            </button>
          ))}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/60 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
            </option>
          ))}
        </select>
        <select
          value={scanId}
          onChange={(e) => setScanId(e.target.value)}
          className="max-w-[240px] rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2 text-xs text-slate-300 focus:border-cyan-500/60 focus:outline-none"
        >
          <option value="all">All scans</option>
          {scans.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
          {filtered.length === 0 ? (
            <div className="p-14 text-center text-sm text-slate-500">
              No findings match the current filters.
            </div>
          ) : (
            <ul>
              {filtered.map((f) => (
                <li
                  key={f.id}
                  onClick={() => setDrawerFinding(f)}
                  className="flex cursor-pointer items-center gap-4 border-b border-white/5 px-5 py-4 transition last:border-0 hover:bg-white/[0.03]"
                >
                  <SeverityBadge severity={f.severity} score={Number(f.cvss)} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{f.title}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                      {f.method} {f.endpoint} · {f.cwe} · OWASP {f.owasp}
                    </p>
                  </div>
                  <span className="hidden max-w-[180px] truncate text-xs text-slate-500 md:block">
                    {scanName[f.scan_id] || `scan #${f.scan_id}`}
                  </span>
                  <FindingStatusBadge status={f.status} />
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FindingDrawer
        finding={drawerFinding}
        scanName={drawerFinding ? scanName[drawerFinding.scan_id] : undefined}
        onClose={() => setDrawerFinding(null)}
        onSetStatus={setFindingStatus}
      />
    </div>
  );
}
