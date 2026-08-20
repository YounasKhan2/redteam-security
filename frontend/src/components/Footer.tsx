import { Link } from 'react-router-dom';
import { ShieldHalf, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#04060b]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#0a101c]">
                <ShieldHalf className="h-5 w-5 text-cyan-400" />
                <Zap className="absolute -bottom-1 -right-1 h-3.5 w-3.5 text-rose-500" />
              </span>
              <span className="font-display text-lg font-bold text-white">
                RedTeam <span className="text-cyan-400">QA</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
              The autonomous adversarial QA engine. Continuous red teaming for web apps, APIs and
              microservices — every finding backed by captured evidence, before production ever sees it.
            </p>
            <p className="mt-4 font-mono text-xs text-slate-600">
              SOC 2 Type II infrastructure · ISO 27001 aligned · PCI-DSS evidence packs
            </p>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Platform</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link to="/#capabilities" className="hover:text-cyan-300">Deep Testing Capabilities</Link></li>
              <li><Link to="/#workflow" className="hover:text-cyan-300">Operational Workflow</Link></li>
              <li><Link to="/#report" className="hover:text-cyan-300">QA Report Specification</Link></li>
              <li><Link to="/#roadmap" className="hover:text-cyan-300">Product Roadmap</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Console</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link to="/dashboard" className="hover:text-cyan-300">Dashboard</Link></li>
              <li><Link to="/scans" className="hover:text-cyan-300">Scan History</Link></li>
              <li><Link to="/findings" className="hover:text-cyan-300">Findings Explorer</Link></li>
              <li><Link to="/scans?new=1" className="hover:text-cyan-300">Launch a Scan</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-slate-600 sm:flex-row">
          <p>© 2026 RedTeam QA. Break it in staging, not in production.</p>
          <p className="font-mono">cloud saas · vpc · air-gapped on-prem</p>
        </div>
      </div>
    </footer>
  );
}
