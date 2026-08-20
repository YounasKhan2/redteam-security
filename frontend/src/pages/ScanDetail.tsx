import { useCallback, useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  Download,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Radio,
  Activity,
  Globe,
  Zap,
  CheckCircle2,
  AlertOctagon,
  FileText,
  Network,
  Code,
  Layers,
  FileDown
} from 'lucide-react';
import { api, timeAgo, scanDuration, fmtDateTime } from '../lib/api';
import type { Scan, ScanEvent, Finding } from '../lib/types';
import { ScanStatusBadge, GateBadge, SeverityBadge, FindingStatusBadge, Chip } from '../components/Badges';
import LiveTerminal from '../components/LiveTerminal';
import FindingDrawer from '../components/FindingDrawer';

type Tab = 'feed' | 'findings' | 'surface' | 'report';

interface SurfaceData {
  scan_id: number;
  target_url: string;
  total_routes: number;
  total_params: number;
  routes: string[];
  parameters: string[];
  forms: Array<{ action: string; method: string; inputs: string[] }>;
  dynamic_routes?: string[];
}

const PHASES = [
  { id: 'p-ingest', label: '1. Discovery', short: 'Discovery' },
  { id: 'p-headers', label: '2. Transport', short: 'Transport' },
  { id: 'p-inject', label: '3. Fuzzing', short: 'Fuzzing' },
  { id: 'p-bola', label: '4. BOLA / IDOR', short: 'BOLA' },
  { id: 'p-sqli', label: '5. SQLi / SSRF', short: 'SQLi/SSRF' },
  { id: 'p-rate', label: '6. Rate Limit', short: 'Rate Limit' },
  { id: 'p-done', label: '7. CI Gate', short: 'CI Gate' },
];

export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [surface, setSurface] = useState<SurfaceData | null>(null);
  const [tab, setTab] = useState<Tab>('feed');
  const [report, setReport] = useState<{ markdown: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [sevFilter, setSevFilter] = useState('all');
  const [copiedRoute, setCopiedRoute] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return null;
    const s = await api<Scan>(`/api/scans?id=${id}`);
    setScan(s);
    const [evs, fins] = await Promise.all([
      api<ScanEvent[]>(`/api/events?scan_id=${id}`),
      api<Finding[]>(`/api/findings?scan_id=${id}`),
    ]);
    setEvents(evs);
    setFindings(fins);

    api<SurfaceData>(`/api/surface?scan_id=${id}`)
      .then((data) => setSurface(data))
      .catch(() => {});

    return s;
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const s = await load();
        if (!stopped && s && s.status === 'running') {
          timer = setTimeout(tick, 2000);
        }
      } catch (e) {
        if (!stopped) {
          setError(e instanceof Error ? e.message : 'Failed to load scan');
          timer = setTimeout(tick, 5000);
        }
      }
    };
    tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const openReportTab = async () => {
    setTab('report');
    if (report || !id) return;
    setReportLoading(true);
    try {
      const r = await api<{ markdown: string }>(`/api/report?scan_id=${id}`);
      setReport(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const setFindingStatus = async (fid: number, status: string) => {
    await api('/api/findings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fid, status }),
    });
    if (id) {
      const fins = await api<Finding[]>(`/api/findings?scan_id=${id}`);
      setFindings(fins);
      setDrawerFinding((d) => (d && d.id === fid ? { ...d, status } : d));
    }
  };

  const copyReport = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const copyRoute = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRoute(url);
      setTimeout(() => setCopiedRoute(null), 1500);
    } catch {}
  };

  const downloadReport = () => {
    if (!report || !scan) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redteam-security-report-${String(scan.id).padStart(4, '0')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export specific scan findings to branded PDF
  const exportScanPDF = () => {
    if (!scan) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RedTeam Audit — ${scan.name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { font-size: 24px; font-weight: 800; color: #0284c7; letter-spacing: -0.5px; }
          .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
          .gate-badge { display: inline-block; padding: 6px 14px; border-radius: 6px; font-weight: 800; text-transform: uppercase; font-size: 12px; margin-top: 10px; }
          .gate-fail { background: #ffe4e6; color: #e11d48; border: 1px solid #fda4af; }
          .gate-pass { background: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
          .summary-box { display: flex; gap: 15px; margin: 20px 0 30px 0; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; }
          .metric { flex: 1; text-align: center; }
          .metric-num { font-size: 22px; font-weight: 700; }
          .crit { color: #e11d48; }
          .high { color: #ea580c; }
          .med { color: #d97706; }
          .low { color: #0284c7; }
          .finding-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 18px; page-break-inside: avoid; }
          .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .badge-critical { background: #ffe4e6; color: #e11d48; }
          .badge-high { background: #ffedd5; color: #ea580c; }
          .badge-medium { background: #fef3c7; color: #d97706; }
          .badge-low { background: #e0f2fe; color: #0284c7; }
          pre { background: #0f172a; color: #38bdf8; padding: 12px; border-radius: 6px; font-size: 11px; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #475569; margin-top: 10px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🛡️ RedTeam Security Audit Report — Scan #${scan.id}</div>
          <div class="subtitle"><strong>Target:</strong> ${scan.target_url} · <strong>Scan:</strong> ${scan.name} · <strong>Date:</strong> ${new Date(scan.started_at).toLocaleString()}</div>
          <div class="gate-badge ${scan.gate_status === 'pass' ? 'gate-pass' : 'gate-fail'}">
            CI/CD Gate Verdict: ${scan.gate_status === 'pass' ? 'PASS (Ready for Production)' : 'FAIL (Release Blocked by Security)'}
          </div>
        </div>

        <div class="summary-box">
          <div class="metric"><div class="metric-num">${findings.length}</div><div class="subtitle">Findings</div></div>
          <div class="metric"><div class="metric-num crit">${scan.critical_count}</div><div class="subtitle">Critical</div></div>
          <div class="metric"><div class="metric-num high">${scan.high_count}</div><div class="subtitle">High</div></div>
          <div class="metric"><div class="metric-num med">${scan.medium_count}</div><div class="subtitle">Medium</div></div>
          <div class="metric"><div class="metric-num low">${scan.low_count}</div><div class="subtitle">Low</div></div>
          <div class="metric"><div class="metric-num">${scan.requests_sent}</div><div class="subtitle">Probes Sent</div></div>
        </div>

        <h2>Discovered Vulnerabilities (${findings.length})</h2>
        ${findings.map((f, i) => `
          <div class="finding-card">
            <div>
              <span class="badge badge-${f.severity.toLowerCase()}">${f.severity} (${f.cvss})</span>
              <strong style="margin-left: 8px; font-size: 15px;">${i + 1}. ${f.title}</strong>
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

  const currentPhaseIndex = useMemo(() => {
    if (!scan) return 0;
    if (scan.status === 'completed') return 7;
    const prog = scan.progress;
    if (prog < 25) return 0;
    if (prog < 40) return 1;
    if (prog < 55) return 2;
    if (prog < 70) return 3;
    if (prog < 85) return 4;
    if (prog < 98) return 5;
    return 6;
  }, [scan]);

  const filteredFindings = useMemo(() => {
    if (sevFilter === 'all') return findings;
    return findings.filter((f) => f.severity.toLowerCase() === sevFilter.toLowerCase());
  }, [findings, sevFilter]);

  if (!scan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {error ? <p className="text-rose-400">{error}</p> : <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />}
      </div>
    );
  }

  const running = scan.status === 'running';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <Link to="/scans" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> All scans
        </Link>
        <button
          onClick={exportScanPDF}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 shadow-sm"
        >
          <FileDown className="h-4 w-4" /> Export Scan PDF
        </button>
      </div>

      {/* Main Scan Header Card */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a101c] p-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white">{scan.name}</h1>
              <ScanStatusBadge status={scan.status} progress={scan.progress} />
              <GateBadge gate={scan.gate_status} />
            </div>
            <p className="mt-2 font-mono text-sm text-cyan-300">{scan.target_url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>spec: {scan.spec_type}</Chip>
              <Chip>env: {scan.environment}</Chip>
              <Chip>started: {fmtDateTime(scan.started_at)}</Chip>
              <Chip>duration: {scanDuration(scan)}</Chip>
              <Chip>requests sent: {scan.requests_sent.toLocaleString()}</Chip>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            {[
              { n: scan.critical_count, c: 'text-rose-400', l: 'Crit' },
              { n: scan.high_count, c: 'text-orange-400', l: 'High' },
              { n: scan.medium_count, c: 'text-amber-300', l: 'Med' },
              { n: scan.low_count, c: 'text-sky-400', l: 'Low' },
            ].map((x) => (
              <div key={x.l} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2">
                <p className={`font-display text-2xl font-bold ${x.c}`}>{x.n}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{x.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 7-PHASE VISUAL LIVE STEPPER */}
        <div className="mt-6 border-t border-white/5 pt-5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Adversarial Execution Pipeline (7 Phases)
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {PHASES.map((p, idx) => {
              const isPast = scan.status === 'completed' || currentPhaseIndex > idx;
              const isCurrent = running && currentPhaseIndex === idx;
              return (
                <div
                  key={p.id}
                  className={`relative flex items-center gap-2 rounded-xl border p-2.5 transition ${
                    isCurrent
                      ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/10'
                      : isPast
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                        : 'border-white/5 bg-white/[0.02] text-slate-500'
                  }`}
                >
                  {isCurrent ? (
                    <Radio className="h-4 w-4 shrink-0 animate-pulse text-cyan-400" />
                  ) : isPast ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-slate-700" />
                  )}
                  <span className="truncate text-xs font-semibold">{p.short}</span>
                </div>
              );
            })}
          </div>
        </div>

        {running && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between font-mono text-xs text-slate-500">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Activity className="h-3.5 w-3.5 animate-spin" /> Adversarial engine running active battery...
              </span>
              <span>{scan.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-rose-500 transition-all duration-700"
                style={{ width: `${scan.progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 rounded-xl border border-white/10 bg-[#0a101c] p-1">
        {(
          [
            { k: 'feed', label: 'Live Execution Feed' },
            { k: 'findings', label: `Verified Findings (${findings.length})` },
            { k: 'surface', label: `Surface Map (${surface?.total_routes || '…'} Routes)` },
            { k: 'report', label: 'Report & CI Gate' },
          ] as { k: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.k}
            onClick={() => (t.k === 'report' ? openReportTab() : setTab(t.k))}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === t.k ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="mt-4">
        {tab === 'feed' && (
          <div className="space-y-4">
            {/* Visual Live Attack HUD / Telemetry Card */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a101c] p-4">
                <Globe className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Target Host</p>
                  <p className="font-mono text-xs font-bold text-white truncate max-w-[200px]">{scan.target_url}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a101c] p-4">
                <Zap className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Telemetry Rate</p>
                  <p className="text-xs font-bold text-slate-200">
                    {running ? 'Active (Burst Capped @ 15 req/sec)' : 'Completed — Idle'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0a101c] p-4">
                <Activity className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Attack Vectors</p>
                  <p className="text-xs font-bold text-slate-200">SQLi · SSRF · BOLA · Rate · Auth</p>
                </div>
              </div>
            </div>

            <LiveTerminal events={events} live={running} height="h-[480px]" />
          </div>
        )}

        {tab === 'findings' && (
          <div className="space-y-4">
            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'all', label: 'All Severities', count: findings.length },
                { id: 'critical', label: 'Critical', count: scan.critical_count },
                { id: 'high', label: 'High', count: scan.high_count },
                { id: 'medium', label: 'Medium', count: scan.medium_count },
                { id: 'low', label: 'Low', count: scan.low_count },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSevFilter(pill.id)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    sevFilter === pill.id
                      ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                      : 'border-white/10 bg-[#0a101c] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {pill.label} ({pill.count})
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
              {filteredFindings.length === 0 ? (
                <div className="p-14 text-center text-sm text-slate-500">
                  {running
                    ? 'No confirmed findings in this category yet — verification in progress.'
                    : 'No findings match this severity filter.'}
                </div>
              ) : (
                <ul>
                  {filteredFindings.map((f) => (
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
                      <span className="hidden sm:block">
                        <FindingStatusBadge status={f.status} />
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB: ATTACK SURFACE MAP */}
        {tab === 'surface' && (
          <div className="space-y-5">
            {/* Surface Metrics */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">Discovered Routes</p>
                <p className="font-display mt-1 text-2xl font-bold text-white">
                  {surface?.total_routes || surface?.routes?.length || 0}
                </p>
                <p className="mt-1 text-xs text-slate-400">Scraped from HTML, forms & JS bundles</p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-violet-400">Fuzzable Parameters</p>
                <p className="font-display mt-1 text-2xl font-bold text-white">
                  {surface?.total_params || surface?.parameters?.length || 0}
                </p>
                <p className="mt-1 text-xs text-slate-400">Extracted query & payload parameter keys</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Forms & Handlers</p>
                <p className="font-display mt-1 text-2xl font-bold text-white">
                  {surface?.forms?.length || 1}
                </p>
                <p className="mt-1 text-xs text-slate-400">Interactive input submit targets</p>
              </div>
            </div>

            {/* Discovered Endpoints List */}
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
              <div className="border-b border-white/10 px-5 py-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Target Endpoint Inventory & Attack Matrix
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {(surface?.routes || [scan.target_url]).map((r, i) => {
                  const isApi = r.includes('/api/') || r.includes('/v1/');
                  const isAuth = r.includes('login') || r.includes('auth') || r.includes('signup');
                  const isDynamic = r.includes(':id') || /[0-9]{2,}/.test(r);
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-xs hover:bg-white/[0.02]">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                          isAuth ? 'bg-rose-500/15 text-rose-300' : isApi ? 'bg-cyan-500/15 text-cyan-300' : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          {isAuth ? 'POST' : 'GET'}
                        </span>
                        <span className="font-mono text-slate-200 truncate">{r}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-0.5 text-[10px] text-slate-400">
                          {isAuth ? 'Authentication' : isDynamic ? 'Dynamic Resource' : isApi ? 'API Route' : 'Page Entry'}
                        </span>
                        <button
                          onClick={() => copyRoute(r)}
                          className="rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white"
                          title="Copy URL"
                        >
                          {copiedRoute === r ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Discovered Parameter Cloud */}
            <div className="rounded-2xl border border-white/10 bg-[#0a101c] p-5">
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                Discovered Parameters Tested across Vectors
              </h3>
              <div className="flex flex-wrap gap-2">
                {(surface?.parameters || ['username', 'password', 'id', 'order_id', 'query', 'search', 'email']).map((param) => (
                  <span
                    key={param}
                    className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 font-mono text-xs text-violet-200"
                  >
                    <Code className="h-3 w-3 text-violet-400" /> {param}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'report' && (
          <div className="space-y-4">
            {scan.status === 'completed' && (
              <div
                className={`flex items-center gap-4 rounded-2xl border p-5 ${
                  scan.gate_status === 'pass'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                {scan.gate_status === 'pass' ? (
                  <ShieldCheck className="h-8 w-8 shrink-0 text-emerald-400" />
                ) : (
                  <ShieldAlert className="h-8 w-8 shrink-0 text-rose-400" />
                )}
                <div>
                  <p
                    className={`font-display text-lg font-bold ${
                      scan.gate_status === 'pass' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    CI/CD Gate Verdict: {scan.gate_status === 'pass' ? 'PASS' : 'FAIL'}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Policy: fail promotion on any Critical or High severity finding.{' '}
                    {scan.gate_status === 'pass'
                      ? 'No gate-blocking findings — safe to promote.'
                      : `${scan.critical_count} Critical and ${scan.high_count} High findings block this release.`}
                  </p>
                </div>
              </div>
            )}

            {reportLoading ? (
              <div className="flex h-40 items-center justify-center rounded-2xl border border-white/10 bg-[#0a101c]">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : report ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
                <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
                  <p className="font-mono text-xs text-slate-500">
                    redteam-security-report-{String(scan.id).padStart(4, '0')}.md
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={copyReport}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? 'Copied' : 'Copy Markdown'}
                    </button>
                    <button
                      onClick={downloadReport}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      <Download className="h-3.5 w-3.5" /> Download Markdown
                    </button>
                    <button
                      onClick={exportScanPDF}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      <FileDown className="h-3.5 w-3.5" /> Export PDF
                    </button>
                  </div>
                </div>
                <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap p-6 font-mono text-xs leading-relaxed text-slate-300">
                  {report.markdown}
                </pre>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-[#0a101c] p-14 text-center text-sm text-slate-500">
                {running ? 'Report compiles when the run completes.' : 'Report unavailable.'}
              </div>
            )}
          </div>
        )}
      </div>

      <FindingDrawer
        finding={drawerFinding}
        scanName={scan.name}
        onClose={() => setDrawerFinding(null)}
        onSetStatus={setFindingStatus}
      />
    </div>
  );
}
