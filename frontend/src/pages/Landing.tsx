import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Zap,
  RefreshCw,
  FileCheck2,
  Wrench,
  ServerCog,
  KeyRound,
  Gauge,
  Braces,
  Workflow,
  Radar,
  Check,
  ArrowRight,
  FlaskConical,
  ShieldCheck,
  BarChart3,
  Cloud,
  Server,
  TerminalSquare,
  Lock,
} from 'lucide-react';
import { api, SEV_META } from '../lib/api';
import type { ContentBundle, Stats, Finding } from '../lib/types';
import { Chip, SeverityBadge } from '../components/Badges';
import { useAuth } from '../contexts/AuthContext';

const ICONS: Record<string, any> = { KeyRound, Gauge, Braces, Workflow, Radar };
const PERSONA_ICONS: Record<string, any> = { FlaskConical, ShieldCheck, BarChart3 };

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5 },
};

const VALUE_PROPS = [
  {
    icon: RefreshCw,
    title: 'Continuous Penetration Testing',
    text: 'Not a once-a-quarter audit. Every build, every merge, every staging deploy is probed by an autonomous adversary that never sleeps.',
    accent: 'text-cyan-400',
  },
  {
    icon: FileCheck2,
    title: 'Evidence-Backed Findings',
    text: 'Zero-hallucination policy: a finding only exists when the runner captured a reproducible request/response pair. No maybes, no noise.',
    accent: 'text-emerald-400',
  },
  {
    icon: Wrench,
    title: 'Immediate QA Remediation',
    text: 'Every finding ships with a cURL reproduction, business impact, and concrete remediation steps — ready to paste into a ticket or a fix PR.',
    accent: 'text-amber-300',
  },
  {
    icon: ServerCog,
    title: 'Deployment Flexibility',
    text: 'Multi-tenant cloud SaaS or an air-gapped on-premise container. Same engine, same reports — your data never has to leave.',
    accent: 'text-violet-400',
  },
];

function HeroTerminal({ findings, locked }: { findings: Finding[]; locked?: boolean }) {
  const lines = useMemo(() => {
    if (locked) {
      return [
        { level: 'CMD', text: '$ redqa scan --target https://staging.yourapp.dev' },
        { level: 'INFO', text: '[auth] workspace locked — sign in to stream live adversarial results' },
        { level: 'EXEC', text: '[scope] continuous pentesting · evidence-backed findings · zero hallucination' },
        { level: 'VERIFY', text: '[verify] CVSS v3.1 scoring · cURL reproduction · remediation attached' },
        { level: 'GATE', text: '[gate] sign in to watch the engine hunt in real time' },
      ];
    }
    const base: { level: string; text: string }[] = [
      { level: 'CMD', text: '$ redqa scan --target https://staging.yourapp.dev --spec openapi.yaml' },
      { level: 'INFO', text: '[recon] spec parsed · attack surface mapped · 5 batteries armed' },
    ];
    findings.slice(0, 4).forEach((f) => {
      base.push({
        level: f.severity.toUpperCase(),
        text: `[${f.severity.slice(0, 4).toUpperCase()}] ${f.title} — ${f.method} ${f.endpoint}`,
      });
    });
    base.push({ level: 'VERIFY', text: '[verify] candidates replayed 3× · evidence captured · false positives eliminated' });
    base.push({ level: 'GATE', text: '[gate] report compiled — every finding backed by request/response proof' });
    return base;
  }, [findings, locked]);

  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (lines.length === 0) return;
    const t = setInterval(() => {
      setVisible((v) => (v >= lines.length + 4 ? 0 : v + 1));
    }, 850);
    return () => clearInterval(t);
  }, [lines.length]);

  const style = (lvl: string) =>
    lvl === 'CMD'
      ? 'text-slate-200'
      : lvl === 'VERIFY'
        ? 'text-amber-300'
        : lvl === 'GATE'
          ? 'text-emerald-400'
          : lvl === 'INFO'
            ? 'text-slate-500'
            : SEV_META[lvl.toLowerCase()]?.color || 'text-slate-400';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#04060b] shadow-2xl shadow-cyan-500/5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-cyan-500/10 to-transparent" />
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a101c] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 flex items-center gap-1.5 font-mono text-xs text-slate-500">
          <TerminalSquare className="h-3.5 w-3.5" /> redqa — live from the last run
        </span>
      </div>
      <div className="h-[300px] overflow-hidden p-4 font-mono text-[12px] leading-relaxed sm:text-[12.5px]">
        {lines.slice(0, Math.min(visible, lines.length)).map((l, i) => (
          <motion.p
            key={`${i}-${l.text.slice(0, 12)}`}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className={`whitespace-pre-wrap py-0.5 ${style(l.level)}`}
          >
            {l.text}
          </motion.p>
        ))}
        <span className="terminal-caret text-cyan-400">▊</span>
      </div>
    </div>
  );
}

function SectionHead({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">{kicker}</p>
      <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-slate-400">{sub}</p>}
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentBundle | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [featured, setFeatured] = useState<Finding | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    // Public marketing content — no auth required.
    api<ContentBundle>('/api/content?type=all')
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    // Live workspace data — authenticated only.
    if (user) {
      Promise.all([api<Stats>('/api/stats'), api<Finding[]>('/api/findings?severity=critical&limit=1')])
        .then(([s, f]) => {
          if (cancelled) return;
          setStats(s);
          setFeatured(f[0] || null);
        })
        .catch(() => {
          /* live panel stays in its signed-out state */
        });
    } else {
      setStats(null);
      setFeatured(null);
    }
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="overflow-hidden">
      {/* HERO */}
      <section className="bg-grid relative">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="pointer-events-none absolute top-40 right-0 h-[300px] w-[400px] rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Autonomous Adversarial QA Engine
              </span>
              <h1 className="font-display mt-6 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
                Ship the build.
                <br />
                <span className="text-gradient">We try to break it first.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-400">
                RedTeam QA continuously tests, fuzzes, and attacks your web apps, APIs and
                microservices in staging — before production ever sees the traffic. Every finding is
                evidence-backed, CVSS-scored, and ready for remediation.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/scans?new=1"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110"
                >
                  <Zap className="h-4 w-4" /> Launch an Adversarial Scan
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Explore the Dashboard <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
                {['Zero-hallucination evidence', 'CVSS v3.1 scored', 'CI/CD gating', 'Cloud or air-gapped'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
          >
            <HeroTerminal findings={stats?.recent_findings || []} locked={!user} />
          </motion.div>
        </div>

        {/* stats strip */}
        <div className="relative border-y border-white/10 bg-[#070b13]/80">
          {user ? (
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px sm:grid-cols-4">
              {[
                { v: stats ? String(stats.completed_scans) : '—', l: 'adversarial runs executed' },
                { v: stats ? String(stats.total_findings) : '—', l: 'findings confirmed with evidence' },
                { v: stats ? String(stats.dismissed_findings) : '—', l: 'false positives eliminated' },
                { v: stats ? `${stats.gate_pass_rate}%` : '—', l: 'CI gates passed clean' },
              ].map((s) => (
                <div key={s.l} className="px-6 py-6 text-center">
                  <p className="font-display text-3xl font-bold text-white">{s.v}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{s.l}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-6 py-6 text-center">
              <Lock className="h-4 w-4 text-cyan-400" />
              <p className="text-sm text-slate-400">
                Live adversarial metrics — runs, confirmed findings, gate verdicts — are workspace-private.
              </p>
              <Link to="/login" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                Sign in to view →
              </Link>
            </div>
          )}
        </div>
        {error && (
          <p className="bg-rose-500/10 py-2 text-center text-xs text-rose-400">
            Could not load live data: {error}
          </p>
        )}
      </section>

      {/* VALUE PROPS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead
          kicker="Why RedTeam QA"
          title="An adversary on your payroll"
          sub="Four guarantees that separate autonomous red teaming from a noisy vulnerability scanner."
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((v, i) => (
            <motion.div
              key={v.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-[#0a101c] p-6 transition hover:border-white/20"
            >
              <v.icon className={`h-6 w-6 ${v.accent}`} />
              <h3 className="font-display mt-4 text-base font-bold text-white">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{v.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section id="capabilities" className="border-t border-white/5 bg-[#070b13] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead
            kicker="Deep Testing Capabilities"
            title="Five attack batteries. One engine."
            sub="Each battery is a specialized adversarial planner plus a hardened execution runner, mapped to CWE and OWASP Top 10."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(content?.features || []).map((f, i) => {
              const Icon = ICONS[f.icon] || Radar;
              return (
                <motion.div
                  key={f.id}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
                  className="group rounded-2xl border border-white/10 bg-[#0a101c] p-6 transition hover:border-cyan-500/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <Icon className="h-5 w-5 text-cyan-400" />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      Battery {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-lg font-bold text-white">{f.name}</h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-cyan-400/80">
                    {f.category}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{f.description}</p>
                  <ul className="mt-4 space-y-2">
                    {f.checks.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WORKFLOW */}
      <section id="workflow" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead
          kicker="Operational Workflow"
          title="From spec to gate verdict, autonomously"
          sub="Five stages take a target from contract ingestion to a pipeline-blocking QA report."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {(content?.workflow || []).map((w, i) => (
            <motion.div key={w.id} {...fadeUp} transition={{ duration: 0.5, delay: i * 0.08 }} className="relative">
              <div className="flex items-center gap-3">
                <span className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-sm font-bold text-cyan-300">
                  {w.step_number}
                </span>
                {i < (content?.workflow.length || 0) - 1 && (
                  <span className="hidden h-px flex-1 bg-gradient-to-r from-cyan-500/40 to-transparent lg:block" />
                )}
              </div>
              <h3 className="font-display mt-4 text-base font-bold text-white">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{w.description}</p>
              <ul className="mt-3 space-y-1.5">
                {w.details.map((d) => (
                  <li key={d} className="flex items-start gap-1.5 text-xs leading-relaxed text-slate-500">
                    <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-cyan-500" />
                    {d}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FINDING ANATOMY */}
      <section id="report" className="border-t border-white/5 bg-[#070b13] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead
            kicker="QA Report Specification"
            title="Anatomy of a finding"
            sub="This is a real finding from the demo environment, fetched live from the database — exactly what lands in your QA report."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-5">
            <motion.div {...fadeUp} className="rounded-2xl border border-white/10 bg-[#0a101c] p-6 lg:col-span-3">
              {featured ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={featured.severity} score={Number(featured.cvss)} />
                    <Chip>{featured.cwe}</Chip>
                    <Chip>OWASP {featured.owasp}</Chip>
                  </div>
                  <h3 className="font-display mt-4 text-xl font-bold text-white">{featured.title}</h3>
                  <p className="mt-1 font-mono text-xs text-cyan-300">
                    {featured.method} {featured.endpoint}
                  </p>
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#04060b] p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Reproduction — cURL
                    </p>
                    <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-cyan-200">
                      {featured.curl}
                    </pre>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Expected</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{featured.expected_response}</p>
                    </div>
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Actual</p>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{featured.actual_response}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Business impact</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{featured.business_impact}</p>
                  </div>
                </>
              ) : (
                <div className="flex h-64 items-center justify-center px-8 text-center text-sm text-slate-600">
                  {user
                    ? 'No findings yet — launch your first scan and a real, evidence-backed example will appear here.'
                    : 'Sign in to see a real, evidence-backed finding from your workspace here.'}
                </div>
              )}
            </motion.div>
            <motion.div {...fadeUp} className="lg:col-span-2">
              <div className="space-y-3">
                {[
                  { t: 'Title & Categorization', d: 'Every finding is mapped to a CWE identifier and the OWASP Top 10 / OWASP API Security category.' },
                  { t: 'Severity Rating', d: 'CVSS v3.1 base score with Critical / High / Medium / Low classification drives triage order.' },
                  { t: 'Reproduction Steps', d: 'Copy-paste cURL command plus expected vs. actual HTTP response, captured by the runner.' },
                  { t: 'Business Impact Summary', d: 'Plain-language risk statement your CTO and your board can read — revenue, data, trust.' },
                  { t: 'Remediation Guidance', d: 'Concrete, ordered engineering steps — plus a regression test derived from the reproduction.' },
                ].map((x, i) => (
                  <div key={x.t} className="flex gap-4 rounded-xl border border-white/10 bg-[#0a101c] p-4">
                    <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-sm font-bold text-emerald-300">
                      {i + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-bold text-white">{x.t}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{x.d}</p>
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-xs leading-relaxed text-slate-400">
                  <span className="font-bold text-rose-400">CI/CD gating:</span> pipelines fail automatically on
                  any Critical or High finding. Markdown, JSON and HTML reports ship to GitHub Actions, GitLab CI,
                  Jira and Slack.
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* DEPLOYMENT */}
      <section id="deployment" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead
          kicker="Architecture & Deployment"
          title="Your data, your perimeter"
          sub="One engine, two deployment models. Move between them without changing your workflow."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {(content?.deployments || []).map((d, i) => {
            const Icon = i === 0 ? Cloud : Server;
            return (
              <motion.div
                key={d.id}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`rounded-2xl border p-8 ${
                  i === 0 ? 'border-cyan-500/30 bg-cyan-500/[0.04]' : 'border-violet-500/30 bg-violet-500/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                    <Icon className={`h-5 w-5 ${i === 0 ? 'text-cyan-400' : 'text-violet-400'}`} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">{d.name}</h3>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${i === 0 ? 'text-cyan-400' : 'text-violet-400'}`}>
                      {d.tagline}
                    </p>
                  </div>
                </div>
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">Infra</dt>
                    <dd className="text-slate-300">{d.infrastructure}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">Data</dt>
                    <dd className="text-slate-300">{d.data_policy}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-slate-500">Inference</dt>
                    <dd className="text-slate-300">{d.inference}</dd>
                  </div>
                </dl>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {d.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${i === 0 ? 'text-cyan-400' : 'text-violet-400'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-white/10 pt-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Built for</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {d.ideal_for.map((x) => (
                      <span key={x} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {x}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* PERSONAS */}
      <section className="border-t border-white/5 bg-[#070b13] py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHead
            kicker="Who It's For"
            title="Built for the people who ship"
            sub="QA, security, and leadership each get a different kind of confidence out of every run."
          />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {(content?.personas || []).map((p, i) => {
              const Icon = PERSONA_ICONS[p.icon] || ShieldCheck;
              return (
                <motion.div
                  key={p.id}
                  {...fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-[#0a101c] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <Icon className="h-5 w-5 text-amber-300" />
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {p.focus}
                    </span>
                  </div>
                  <h3 className="font-display mt-4 text-base font-bold text-white">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.description}</p>
                  <ul className="mt-4 space-y-2">
                    {p.goals.map((g) => (
                      <li key={g} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                        {g}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section id="roadmap" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead
          kicker="Product Roadmap"
          title="Where the engine goes next"
          sub="From REST-first MVP to enterprise multi-protocol red teaming."
        />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {(content?.roadmap || []).map((r, i) => {
            const tone =
              r.status === 'Shipped'
                ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                : r.status === 'In Progress'
                  ? 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10'
                  : 'border-slate-500/30 text-slate-400 bg-slate-500/10';
            return (
              <motion.div
                key={r.id}
                {...fadeUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-[#0a101c] p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-slate-500">
                    {r.phase}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tone}`}>
                    {r.status}
                  </span>
                </div>
                <h3 className="font-display mt-3 text-base font-bold text-white">{r.title}</h3>
                <p className="mt-1 text-xs text-slate-500">{r.timeline}</p>
                <ul className="mt-4 space-y-2">
                  {r.items.map((x) => (
                    <li key={x} className="flex items-start gap-2 text-sm text-slate-300">
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                      {x}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/5">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-rose-500/10" />
        <div className="relative mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Start breaking things — <span className="text-gradient">safely.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            Point the engine at your staging environment and watch it hunt. Your first adversarial
            scan takes minutes, not quarters.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/scans?new=1"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-500/25 transition hover:brightness-110"
            >
              <Zap className="h-4 w-4" /> Launch Your First Scan
            </Link>
            <Link
              to="/findings"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Browse Findings Explorer
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
