import { useState } from 'react';
import { X, Copy, Check, CheckCircle2, XCircle, RotateCcw, Crosshair } from 'lucide-react';
import type { Finding } from '../lib/types';
import { SEV_META, cvssColor } from '../lib/api';
import { SeverityBadge, FindingStatusBadge, Chip } from './Badges';

export default function FindingDrawer({
  finding,
  scanName,
  onClose,
  onSetStatus,
}: {
  finding: Finding | null;
  scanName?: string;
  onClose: () => void;
  onSetStatus?: (id: number, status: string) => Promise<void> | void;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!finding) return null;
  const m = SEV_META[finding.severity] || SEV_META.low;
  const cvss = Number(finding.cvss);

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(finding.curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  const setStatus = async (status: string) => {
    if (!onSetStatus) return;
    setBusy(true);
    try {
      await onSetStatus(finding.id, status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#070b13] shadow-2xl">
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} />
              <FindingStatusBadge status={finding.status} />
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <h2 className="font-display mt-3 text-xl font-bold leading-snug text-white">{finding.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip>{finding.cwe}</Chip>
            <Chip>OWASP {finding.owasp}</Chip>
            <Chip>{finding.category}</Chip>
            {scanName && <Chip>run: {scanName}</Chip>}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">CVSS v3.1</p>
              <p className={`font-display mt-1 text-3xl font-bold ${cvssColor(cvss)}`}>{cvss.toFixed(1)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Endpoint</p>
              <p className="mt-1.5 flex items-center gap-2 font-mono text-sm text-slate-200">
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                <span className="truncate">
                  {finding.method} {finding.endpoint}
                </span>
              </p>
            </div>
          </div>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Reproduction — cURL
              </h3>
              <button
                onClick={copyCurl}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/5"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-[#04060b] p-4 font-mono text-xs leading-relaxed text-cyan-200">
              {finding.curl}
            </pre>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                Expected response
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{finding.expected_response}</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Actual response</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{finding.actual_response}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Business impact</h3>
            <p className="rounded-xl border border-white/10 bg-[#0a101c] p-4 text-sm leading-relaxed text-slate-300">
              {finding.business_impact}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Remediation guidance</h3>
            <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-relaxed text-slate-300">
              {finding.remediation}
            </p>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Evidence & verification
            </h3>
            <p className={`rounded-xl border p-4 font-mono text-xs leading-relaxed text-slate-400 ${m.border} ${m.bg}`}>
              {finding.evidence}
            </p>
          </section>
        </div>

        {onSetStatus && (
          <div className="flex items-center gap-2 border-t border-white/10 p-4">
            <button
              disabled={busy || finding.status === 'fixed'}
              onClick={() => setStatus('fixed')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Fixed
            </button>
            <button
              disabled={busy || finding.status === 'dismissed'}
              onClick={() => setStatus('dismissed')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-500/40 bg-slate-500/10 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-500/20 disabled:opacity-40"
            >
              <XCircle className="h-3.5 w-3.5" /> Dismiss (False Positive)
            </button>
            <button
              disabled={busy || finding.status === 'open'}
              onClick={() => setStatus('open')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-400/20 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reopen
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
