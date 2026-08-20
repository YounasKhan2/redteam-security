import { useEffect, useMemo, useState } from 'react';
import { X, Crosshair, ListChecks, Rocket, Loader2, Lock } from 'lucide-react';
import { api } from '../lib/api';
import type { TestModule } from '../lib/types';

const SPEC_TYPES = ['OpenAPI 3.x (Swagger)', 'Swagger 2.0', 'Postman Collection', 'HAR Archive'];
const ENVIRONMENTS = ['staging', 'qa', 'pre-prod'];

export default function NewScanWizard({
  open,
  onClose,
  onLaunched,
}: {
  open: boolean;
  onClose: () => void;
  onLaunched: (id: number) => void;
}) {
  const [step, setStep] = useState(1);
  const [modules, setModules] = useState<TestModule[]>([]);
  const [name, setName] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [specType, setSpecType] = useState(SPEC_TYPES[0]);
  const [environment, setEnvironment] = useState('staging');
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError('');
    setLaunching(false);
    api<TestModule[]>('/api/content?type=modules')
      .then((ms) => {
        setModules(ms);
        setSelected(ms.filter((m) => m.status !== 'Roadmap').map((m) => m.name));
      })
      .catch(() => {});
  }, [open]);

  const groups = useMemo(() => {
    const g: Record<string, TestModule[]> = {};
    modules.forEach((m) => {
      if (!g[m.category]) g[m.category] = [];
      g[m.category].push(m);
    });
    return g;
  }, [modules]);

  if (!open) return null;

  const toggle = (n: string) =>
    setSelected((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  const next = () => {
    if (step === 1) {
      if (!name.trim()) {
        setError('Give this scan a name.');
        return;
      }
      if (!/^https?:\/\/.+\..+/.test(targetUrl.trim())) {
        setError('Enter a valid staging URL, e.g. https://staging-api.example.com');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      if (selected.length === 0) {
        setError('Arm at least one adversarial module.');
        return;
      }
      setError('');
      setStep(3);
    }
  };

  const launch = async () => {
    setLaunching(true);
    setError('');
    try {
      const scan = await api<{ id: number }>('/api/scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          target_url: targetUrl.trim(),
          spec_type: specType,
          environment,
          modules: selected,
        }),
      });
      onLaunched(scan.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to launch scan');
      setLaunching(false);
    }
  };

  const STEPS = [
    { n: 1, label: 'Target & Scope', icon: Crosshair },
    { n: 2, label: 'Adversarial Modules', icon: ListChecks },
    { n: 3, label: 'Review & Launch', icon: Rocket },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#070b13] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-white">New Adversarial Scan</h2>
            <p className="text-xs text-slate-500">Scoped, credential-limited, staging-safe</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                  step === s.n
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                    : step > s.n
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                      : 'border-white/10 text-slate-500'
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{s.label}</span>
                <span className="sm:hidden">{s.n}</span>
              </div>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Scan name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Payments API — nightly sweep"
                  className="w-full rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Target URL (staging)
                </label>
                <input
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://staging-api.example.com"
                  className="w-full rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:border-cyan-500/60 focus:outline-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    API contract source
                  </label>
                  <select
                    value={specType}
                    onChange={(e) => setSpecType(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2.5 text-sm text-white focus:border-cyan-500/60 focus:outline-none"
                  >
                    {SPEC_TYPES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Environment
                  </label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-[#0a101c] px-3 py-2.5 text-sm text-white focus:border-cyan-500/60 focus:outline-none"
                  >
                    {ENVIRONMENTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs text-slate-400">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                Boundary rules are enforced at the runner: only the target host is touched, with scoped
                test credentials and rate caps. Production is never in scope.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {Object.entries(groups).map(([cat, mods]) => (
                <div key={cat}>
                  <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{cat}</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {mods.map((m) => {
                      const disabled = m.status === 'Roadmap';
                      const checked = selected.includes(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggle(m.name)}
                          className={`rounded-lg border p-3 text-left transition ${
                            disabled
                              ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50'
                              : checked
                                ? 'border-cyan-500/50 bg-cyan-500/10'
                                : 'border-white/10 bg-[#0a101c] hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-white">{m.name}</span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                m.status === 'GA'
                                  ? 'bg-emerald-500/15 text-emerald-300'
                                  : m.status === 'Beta'
                                    ? 'bg-amber-400/15 text-amber-300'
                                    : 'bg-slate-500/15 text-slate-400'
                              }`}
                            >
                              {m.status}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500">{m.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
                <p className="font-display text-base font-bold text-white">{name || 'Untitled scan'}</p>
                <p className="mt-1 font-mono text-xs text-cyan-300">{targetUrl}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400 sm:grid-cols-3">
                  <div><span className="text-slate-600">Spec:</span> {specType}</div>
                  <div><span className="text-slate-600">Env:</span> {environment}</div>
                  <div><span className="text-slate-600">Modules:</span> {selected.length}</div>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Armed modules</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.map((s) => (
                    <span key={s} className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-200">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                On launch, the engine ingests the spec, generates the adversarial suite, and begins
                controlled execution. Findings appear live as they are confirmed with evidence.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <p className="text-xs text-rose-400">{error}</p>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={next}
                className="rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 hover:brightness-110"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={launch}
                disabled={launching}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-rose-500/25 hover:brightness-110 disabled:opacity-60"
              >
                {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                {launching ? 'Arming runner…' : 'Launch Adversarial Scan'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
