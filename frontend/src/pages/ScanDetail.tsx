import { useCallback, useEffect, useState } from 'react';
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
} from 'lucide-react';
import { api, timeAgo, scanDuration, fmtDateTime } from '../lib/api';
import type { Scan, ScanEvent, Finding } from '../lib/types';
import { ScanStatusBadge, GateBadge, SeverityBadge, FindingStatusBadge, Chip } from '../components/Badges';
import LiveTerminal from '../components/LiveTerminal';
import FindingDrawer from '../components/FindingDrawer';

type Tab = 'feed' | 'findings' | 'report';

export default function ScanDetail() {
  const { id } = useParams();
  const [scan, setScan] = useState<Scan | null>(null);
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [tab, setTab] = useState<Tab>('feed');
  const [report, setReport] = useState<{ markdown: string } | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [drawerFinding, setDrawerFinding] = useState<Finding | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

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
    return s;
  }, [id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = async () => {
      try {
        const s = await load();
        if (!stopped && s && s.status === 'running') {
          timer = setTimeout(tick, 2500);
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

  const downloadReport = () => {
    if (!report || !scan) return;
    const blob = new Blob([report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redqa-report-${String(scan.id).padStart(4, '0')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!scan) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        {error ? (
          <p className="text-rose-400">{error}</p>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        )}
      </div>
    );
  }

  const running = scan.status === 'running';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/scans" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> All scans
      </Link>

      <div className="mt-4 rounded-2xl border border-white/10 bg-[#0a101c] p-6">
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
              <Chip>requests: {scan.requests_sent.toLocaleString()}</Chip>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            {[
              { n: scan.critical_count, c: 'text-rose-400', l: 'Crit' },
              { n: scan.high_count, c: 'text-orange-400', l: 'High' },
              { n: scan.medium_count, c: 'text-amber-300', l: 'Med' },
              { n: scan.low_count, c: 'text-sky-400', l: 'Low' },
            ].map((x) => (
              <div key={x.l}>
                <p className={`font-display text-2xl font-bold ${x.c}`}>{x.n}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500">{x.l}</p>
              </div>
            ))}
          </div>
        </div>

        {running && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between font-mono text-xs text-slate-500">
              <span>adversarial execution in progress…</span>
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

        {scan.modules && scan.modules.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-1.5 border-t border-white/5 pt-4">
            {scan.modules.map((m) => (
              <span
                key={m}
                className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2 py-0.5 text-[11px] text-cyan-200/80"
              >
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-1 rounded-xl border border-white/10 bg-[#0a101c] p-1">
        {(
          [
            { k: 'feed', label: 'Live Execution Feed' },
            { k: 'findings', label: `Findings (${findings.length})` },
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

      <div className="mt-4">
        {tab === 'feed' && <LiveTerminal events={events} live={running} height="h-[480px]" />}

        {tab === 'findings' && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a101c]">
            {findings.length === 0 ? (
              <div className="p-14 text-center text-sm text-slate-500">
                {running
                  ? 'No confirmed findings yet — verification in progress. Candidates without evidence are dropped.'
                  : 'Clean run — no confirmed findings.'}
              </div>
            ) : (
              <ul>
                {findings.map((f) => (
                  <li
                    key={f.id}
                    onClick={() => setDrawerFinding(f)}
                    className="flex cursor-pointer items-center gap-4 border-b border-white/5 px-5 py-4 transition last:border-0 hover:bg-white/[0.03]"
                  >
                    <SeverityBadge severity={f.severity} score={Number(f.cvss)} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{f.title}</p>
                      <p className="mt-0.5 truncate font-mono text-xs text-slate-500">
                        {f.method} {f.endpoint} · {f.cwe}
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
                    redqa-report-{String(scan.id).padStart(4, '0')}.md
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
                      <Download className="h-3.5 w-3.5" /> Download
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
