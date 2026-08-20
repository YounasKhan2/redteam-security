import type { ReactNode } from 'react';
import { SEV_META } from '../lib/api';

export function SeverityBadge({ severity, score }: { severity: string; score?: number }) {
  const m = SEV_META[severity] || SEV_META.low;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${m.color} ${m.bg} ${m.border}`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.bar }} />
      {m.label}
      {score !== undefined && <span className="opacity-80">· {score.toFixed(1)}</span>}
    </span>
  );
}

export function ScanStatusBadge({ status, progress }: { status: string; progress?: number }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
        Running{progress !== undefined ? ` · ${progress}%` : ''}
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Completed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
      {status}
    </span>
  );
}

const FINDING_STATUS: Record<string, string> = {
  open: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  in_review: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  fixed: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  dismissed: 'border-slate-500/40 bg-slate-500/10 text-slate-400',
};

const FINDING_STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  in_review: 'In Review',
  fixed: 'Fixed',
  dismissed: 'Dismissed',
};

export function FindingStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
        FINDING_STATUS[status] || FINDING_STATUS.open
      }`}
    >
      {FINDING_STATUS_LABEL[status] || status}
    </span>
  );
}

export function GateBadge({ gate }: { gate: string | null }) {
  if (!gate) return <span className="text-xs text-slate-600">—</span>;
  if (gate === 'pass') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
        Gate Pass
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-400">
      Gate Fail
    </span>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-300">
      {children}
    </span>
  );
}
