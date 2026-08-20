import type { LucideIcon } from 'lucide-react';

export default function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = 'text-cyan-400',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a101c] p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <p className="font-display mt-2 text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
