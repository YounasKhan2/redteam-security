import { useState } from 'react';
import { 
  X, Copy, Check, CheckCircle2, XCircle, RotateCcw, Crosshair, 
  Terminal, ShieldAlert, Code2, FileText, AlertTriangle, ArrowRight
} from 'lucide-react';
import type { Finding } from '../lib/types';
import { SEV_META, cvssColor } from '../lib/api';
import { SeverityBadge, FindingStatusBadge, Chip } from './Badges';

type DrawerTab = 'overview' | 'curl' | 'remediation';

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
  const [activeTab, setActiveTab] = useState<DrawerTab>('overview');
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

  // Generate a sample before/after code diff based on finding category
  const generateCodeDiff = () => {
    if (finding.title.toLowerCase().includes('sql') || finding.cwe === 'CWE-89') {
      return {
        lang: 'python',
        vulnerable: `# Vulnerable: Dynamic string concatenation\nquery = f"SELECT * FROM items WHERE search = '{search}'"\ndb.execute(query)`,
        secure: `# Secure Fix: Parameterized query\nquery = "SELECT * FROM items WHERE search = :search"\ndb.execute(query, {"search": search})`
      };
    }
    if (finding.title.toLowerCase().includes('bola') || finding.title.toLowerCase().includes('idor') || finding.cwe === 'CWE-639') {
      return {
        lang: 'typescript',
        vulnerable: `// Vulnerable: Fetches record without tenant check\nconst order = await db.order.findUnique({\n  where: { id: req.params.id }\n});\nreturn res.json(order);`,
        secure: `// Secure Fix: Enforce tenant ownership at query level\nconst order = await db.order.findFirst({\n  where: {\n    id: req.params.id,\n    tenantId: req.user.tenantId\n  }\n});\nif (!order) return res.status(404).json({ error: 'Not found' });\nreturn res.json(order);`
      };
    }
    if (finding.title.toLowerCase().includes('rate limit') || finding.cwe === 'CWE-799') {
      return {
        lang: 'typescript',
        vulnerable: `// Vulnerable: Unthrottled login endpoint\napp.post('/api/auth/login', async (req, res) => {\n  return handleLogin(req, res);\n});`,
        secure: `// Secure Fix: Apply Redis rate limiter middleware\nconst loginLimiter = rateLimit({\n  windowMs: 60 * 1000, // 1 minute\n  max: 5, // max 5 attempts\n  message: { error: 'Too many login attempts. Retry in 60s.' }\n});\napp.post('/api/auth/login', loginLimiter, handleLogin);`
      };
    }
    if (finding.title.toLowerCase().includes('500') || finding.cwe === 'CWE-754') {
      return {
        lang: 'typescript',
        vulnerable: `// Vulnerable: Unvalidated null inputs cause runtime crash\nconst { username, password } = req.body;\nconst user = await auth(username.toLowerCase(), password);`,
        secure: `// Secure Fix: Schema validation with Zod / global error handler\nconst loginSchema = z.object({\n  username: z.string().min(1),\n  password: z.string().min(1)\n});\nconst result = loginSchema.safeParse(req.body);\nif (!result.success) return res.status(400).json({ error: 'Invalid input' });`
      };
    }
    return {
      lang: 'text',
      vulnerable: `# Current implementation allows insecure request\n${finding.endpoint}`,
      secure: `# Secure implementation:\n${finding.remediation}`
    };
  };

  const diff = generateCodeDiff();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <aside className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#070b13] shadow-2xl">
        {/* Header */}
        <div className="border-b border-white/10 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={finding.severity} score={cvss} />
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

          {/* Navigation Tabs */}
          <div className="mt-5 flex gap-1 rounded-xl border border-white/10 bg-[#0a101c] p-1">
            {[
              { id: 'overview', label: 'Overview & Evidence', icon: FileText },
              { id: 'curl', label: 'Reproduction (cURL)', icon: Terminal },
              { id: 'remediation', label: 'AI Code Patch', icon: Code2 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DrawerTab)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
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
                <div className={`rounded-xl border p-4 font-mono text-xs leading-relaxed text-slate-300 ${m.border} ${m.bg}`}>
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

          {/* TAB 3: CODE REMEDIATION & DIFF */}
          {activeTab === 'remediation' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Remediation Strategy</h4>
                <p className="mt-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-relaxed text-slate-300">
                  {finding.remediation}
                </p>
              </div>

              <div>
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Suggested Code Patch (Before vs. After)
                </h4>
                <div className="space-y-3">
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-rose-400">❌ Before (Vulnerable)</p>
                    <pre className="overflow-x-auto font-mono text-xs text-slate-300">
                      {diff.vulnerable}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-emerald-400">✅ After (Secure Fix)</p>
                    <pre className="overflow-x-auto font-mono text-xs text-slate-200">
                      {diff.secure}
                    </pre>
                  </div>
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
