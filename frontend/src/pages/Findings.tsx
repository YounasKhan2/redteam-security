import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search, ChevronRight, Download, FileDown, ShieldAlert, CheckCircle2 } from 'lucide-react';
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
      if (severity !== 'all' && f.severity.toLowerCase() !== severity.toLowerCase()) return false;
      if (status !== 'all' && f.status !== status) return false;
      if (scanId !== 'all' && f.scan_id !== Number(scanId)) return false;
      if (query && !`${f.title} ${f.endpoint} ${f.cwe} ${f.owasp} ${f.category}`.toLowerCase().includes(query.toLowerCase()))
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

  // Export to Branded PDF / Print Report
  const exportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const criticalCount = sevCounts.critical || 0;
    const highCount = sevCounts.high || 0;
    const mediumCount = sevCounts.medium || 0;
    const lowCount = sevCounts.low || 0;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RedTeam Security Findings Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
          .subtitle { color: #64748b; font-size: 14px; margin-top: 4px; }
          .summary-box { display: flex; gap: 20px; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .metric { flex: 1; text-align: center; }
          .metric-num { font-size: 24px; font-weight: 700; }
          .crit { color: #e11d48; }
          .high { color: #ea580c; }
          .med { color: #d97706; }
          .low { color: #0284c7; }
          .finding-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin-bottom: 20px; page-break-inside: avoid; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-critical { background: #ffe4e6; color: #e11d48; }
          .badge-high { background: #ffedd5; color: #ea580c; }
          .badge-medium { background: #fef3c7; color: #d97706; }
          .badge-low { background: #e0f2fe; color: #0284c7; }
          pre { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
          .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; color: #475569; margin-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛡️ RedTeam Adversarial QA — Security Audit Report</div>
          <div class="subtitle">Generated on ${new Date().toLocaleString()} · Target Environment: Staging / QA</div>
        </div>

        <div class="summary-box">
          <div class="metric"><div class="metric-num">${findings.length}</div><div class="subtitle">Total Verified Findings</div></div>
          <div class="metric"><div class="metric-num crit">${criticalCount}</div><div class="subtitle">Critical</div></div>
          <div class="metric"><div class="metric-num high">${highCount}</div><div class="subtitle">High</div></div>
          <div class="metric"><div class="metric-num med">${mediumCount}</div><div class="subtitle">Medium</div></div>
          <div class="metric"><div class="metric-num low">${lowCount}</div><div class="subtitle">Low</div></div>
        </div>

        <h2>Detailed Vulnerability Findings</h2>
        ${filtered.map((f, i) => `
          <div class="finding-card">
            <div>
              <span class="badge badge-${f.severity.toLowerCase()}">${f.severity} (${f.cvss})</span>
              <strong style="margin-left: 8px; font-size: 16px;">${i + 1}. ${f.title}</strong>
            </div>
            <p style="color: #64748b; font-size: 12px; margin: 6px 0;">
              Endpoint: <code>${f.method} ${f.endpoint}</code> · CWE: ${f.cwe} · OWASP: ${f.owasp}
            </p>
            
            <div class="section-title">Reproduction cURL:</div>
            <pre>${f.curl}</pre>

            <div class="section-title">Evidence & Verification:</div>
            <p style="font-size: 12px; color: #334155; margin: 4px 0;">${f.evidence}</p>

            <div class="section-title">Remediation Guidance:</div>
            <p style="font-size: 12px; color: #0369a1; margin: 4px 0;">${f.remediation}</p>
          </div>
        `).join('')}

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">Findings Explorer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Every finding is actively confirmed with reproduction cURL, raw evidence, and code remediation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, endpoint, CWE, OWASP…"
              className="w-72 rounded-lg border border-white/10 bg-[#0a101c] py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
            />
          </div>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
          >
            <FileDown className="h-4 w-4" /> Export Branded PDF
          </button>
        </div>
      </div>

      {/* GLOWING SEVERITY PILLS & FILTERS */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'All', count: sevCounts.all, glow: 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300' },
            { id: 'critical', label: 'Critical', count: sevCounts.critical, glow: 'border-rose-500/50 bg-rose-500/10 text-rose-300 shadow-lg shadow-rose-500/10' },
            { id: 'high', label: 'High', count: sevCounts.high, glow: 'border-orange-500/50 bg-orange-500/10 text-orange-300 shadow-lg shadow-orange-500/10' },
            { id: 'medium', label: 'Medium', count: sevCounts.medium, glow: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
            { id: 'low', label: 'Low', count: sevCounts.low, glow: 'border-sky-500/50 bg-sky-500/10 text-sky-300' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSeverity(s.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition ${
                severity === s.id
                  ? s.glow
                  : 'border-white/10 bg-[#0a101c] text-slate-500 hover:text-slate-300 hover:border-white/20'
              }`}
            >
              {s.label} <span className="opacity-70 font-mono">({s.count || 0})</span>
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
