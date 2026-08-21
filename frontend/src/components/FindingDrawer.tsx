import { useState, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code,
  Terminal,
  FileCode,
  Crosshair,
  Sparkles,
  Loader2
} from 'lucide-react';
import type { Finding } from '../lib/types';
import { SeverityBadge, FindingStatusBadge } from './Badges';
import { api } from '../lib/api';

interface FindingDrawerProps {
  finding: Finding | null;
  scanName?: string;
  onClose: () => void;
  onSetStatus?: (id: number, status: string) => Promise<void>;
}

const FRAMEWORKS = [
  'Laravel / PHP',
  'FastAPI / Python',
  'Next.js / React',
  'Express / Node.js',
  'Django / Python',
  'Go / Gin',
  'Spring Boot / Java'
];

export default function FindingDrawer({
  finding,
  scanName,
  onClose,
  onSetStatus,
}: FindingDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'curl' | 'remediation'>('overview');
  const [copied, setCopied] = useState(false);
  const [copiedSecure, setCopiedSecure] = useState(false);
  const [busy, setBusy] = useState(false);
  
  // Gemini AI Code Patch State
  const [selectedFramework, setSelectedFramework] = useState('Laravel / PHP');
  const [aiPatchLoading, setAiPatchLoading] = useState(false);
  const [aiPatch, setAiPatch] = useState<{
    language?: string;
    root_cause?: string;
    vulnerable_code?: string;
    secure_code?: string;
  } | null>(null);

  if (!finding) return null;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(finding.curl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const copySecureFix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedSecure(true);
      setTimeout(() => setCopiedSecure(false), 1600);
    } catch {}
  };

  const requestAiPatch = async (framework: string) => {
    setSelectedFramework(framework);
    setAiPatchLoading(true);
    try {
      const data = await api<{
        language: string;
        root_cause: string;
        vulnerable_code: string;
        secure_code: string;
      }>('/api/findings/ai-patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finding_id: finding.id,
          framework: framework
        })
      });
      setAiPatch(data);
    } catch (e) {
      console.error('Failed to generate AI patch:', e);
    } finally {
      setAiPatchLoading(false);
    }
  };

  const setStatus = async (s: string) => {
    if (!onSetStatus) return;
    setBusy(true);
    try {
      await onSetStatus(finding.id, s);
    } finally {
      setBusy(false);
    }
  };

  const cvss = Number(finding.cvss);
  const cvssColor = (score: number) => {
    if (score >= 9.0) return 'text-rose-400';
    if (score >= 7.0) return 'text-orange-400';
    if (score >= 4.0) return 'text-amber-300';
    return 'text-sky-400';
  };

  // Fallback static diff
  const staticDiff = {
    vulnerable: `// Insecure route handler on ${finding.endpoint}\napp.get('${finding.endpoint}', (req, res) => {\n  const data = db.query("SELECT * FROM items WHERE id = " + req.params.id);\n  res.json(data);\n});`,
    secure: `// Secure parameterized validation\napp.get('${finding.endpoint}', authenticate, async (req, res) => {\n  const data = await prisma.items.findFirst({\n    where: { id: req.params.id, userId: req.user.id }\n  });\n  if (!data) return res.status(404).json({ error: 'Not found' });\n  res.json(data);\n});`
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm transition-opacity">
      <div className="flex-1" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#060a12] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={finding.severity} score={cvss} />
                <FindingStatusBadge status={finding.status} />
                <span className="font-mono text-xs text-slate-400">
                  {finding.cwe} · OWASP {finding.owasp}
                </span>
              </div>
              <h2 className="font-display text-lg font-bold text-white">{finding.title}</h2>
              {scanName && <p className="text-xs text-slate-500">From scan: {scanName}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 3-Tab Selector */}
          <div className="mt-4 flex gap-1 rounded-xl border border-white/10 bg-[#0a101c] p-1 text-xs font-semibold">
            {[
              { id: 'overview', label: 'Overview & Evidence', icon: Crosshair },
              { id: 'curl', label: 'Reproduction (cURL)', icon: Terminal },
              { id: 'remediation', label: 'AI Code Patch (Gemini)', icon: Sparkles },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/15 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* TAB 1: OVERVIEW & EVIDENCE */}
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">CVSS v3.1 Severity</p>
                  <p className={`font-display mt-1 text-3xl font-bold ${cvssColor(cvss)}`}>{cvss.toFixed(1)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Target Endpoint</p>
                  <p className="mt-1.5 flex items-center gap-2 font-mono text-sm text-slate-200">
                    <Crosshair className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    <span className="truncate">
                      {finding.method} {finding.endpoint}
                    </span>
                  </p>
                </div>
              </div>

              <section className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    <Check className="h-3.5 w-3.5" /> Expected Response
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{finding.expected_response}</p>
                </div>
                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-4">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" /> Actual Server Behavior
                  </h4>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">{finding.actual_response}</p>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Business Risk & Impact</h3>
                <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4 text-xs leading-relaxed text-slate-300">
                  {finding.business_impact}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Raw Verification Evidence
                </h3>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 font-mono text-xs leading-relaxed text-rose-200">
                  {finding.evidence}
                </div>
              </section>
            </>
          )}

          {/* TAB 2: REPRODUCTION CURL */}
          {activeTab === 'curl' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400">
                  Execute this cURL command in any terminal to reproduce the finding:
                </p>
                <button
                  onClick={copyCurl}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy cURL'}
                </button>
              </div>
              <pre className="max-h-[380px] overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-[#04060b] p-4 font-mono text-xs leading-relaxed text-cyan-200">
                {finding.curl}
              </pre>
              <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4 text-xs text-slate-400">
                <p className="font-semibold text-white">QA Verification Note:</p>
                <p className="mt-1">
                  Once your engineering team pushes a fix, re-running this cURL should return an authorized HTTP 401/403/400 instead of the leaked payload or 500 status code.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: AI CODE REMEDIATION & DIFF (GEMINI POWERED) */}
          {activeTab === 'remediation' && (
            <div className="space-y-4">
              {/* Framework Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#0a101c] p-3">
                <div>
                  <span className="text-xs font-bold text-slate-300">Target Framework:</span>
                  <p className="text-[11px] text-slate-500">Select language/stack for Gemini code patch</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedFramework}
                    onChange={(e) => setSelectedFramework(e.target.value)}
                    className="rounded-lg border border-white/10 bg-[#060a12] px-3 py-1.5 text-xs font-semibold text-cyan-300 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  >
                    {FRAMEWORKS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={aiPatchLoading}
                    onClick={() => requestAiPatch(selectedFramework)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-50"
                  >
                    {aiPatchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {aiPatchLoading ? 'Generating...' : 'Generate Fix'}
                  </button>
                </div>
              </div>

              {/* Root Cause Analysis Card */}
              {aiPatch?.root_cause && (
                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
                    <Sparkles className="h-3.5 w-3.5" /> Root Cause Analysis
                  </h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-200">{aiPatch.root_cause}</p>
                </div>
              )}

              {/* Code Diff Before vs After */}
              <div className="space-y-3">
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-400">
                    ❌ Insecure Pattern ({selectedFramework})
                  </p>
                  <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-slate-300">
                    {aiPatch?.vulnerable_code || staticDiff.vulnerable}
                  </pre>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      ✅ Production-Ready Secure Fix ({selectedFramework})
                    </p>
                    <button
                      onClick={() => copySecureFix(aiPatch?.secure_code || staticDiff.secure)}
                      className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      {copiedSecure ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiedSecure ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-emerald-200">
                    {aiPatch?.secure_code || staticDiff.secure}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Status Workflow */}
        {onSetStatus && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#0a101c] p-4">
            <span className="text-xs text-slate-500">Status: <strong className="text-white uppercase">{finding.status}</strong></span>
            <div className="flex gap-2">
              <button
                disabled={busy || finding.status === 'open'}
                onClick={() => setStatus('open')}
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
              >
                <RotateCcw className="h-3 w-3" /> Re-Open
              </button>
              <button
                disabled={busy || finding.status === 'dismissed'}
                onClick={() => setStatus('dismissed')}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-500/30 bg-slate-500/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-500/20 disabled:opacity-40"
              >
                <XCircle className="h-3 w-3 text-slate-400" /> Dismiss
              </button>
              <button
                disabled={busy || finding.status === 'fixed'}
                onClick={() => setStatus('fixed')}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Mark Fixed
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
