import { SEV_META } from '../lib/api';

const ORDER = ['critical', 'high', 'medium', 'low'];

export default function SeverityDonut({
  counts,
  size = 190,
}: {
  counts: Record<string, number>;
  size?: number;
}) {
  const total = ORDER.reduce((a, k) => a + (counts[k] || 0), 0);
  const r = 60;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const segs = ORDER.filter((k) => (counts[k] || 0) > 0).map((k) => {
    const frac = (counts[k] || 0) / total;
    const seg = { k, dash: frac * C, offset: acc * C };
    acc += frac;
    return seg;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 160 160" width={size} height={size} className="-rotate-90">
          <circle cx="80" cy="80" r={r} fill="none" stroke="#111a2b" strokeWidth="16" />
          {segs.map((s) => (
            <circle
              key={s.k}
              cx="80"
              cy="80"
              r={r}
              fill="none"
              stroke={SEV_META[s.k].bar}
              strokeWidth="16"
              strokeDasharray={`${Math.max(s.dash - 2, 0.5)} ${C}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-white">{total}</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">open findings</span>
        </div>
      </div>
      <div className="space-y-2">
        {ORDER.map((k) => (
          <div key={k} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SEV_META[k].bar }} />
            <span className="w-16 capitalize text-slate-400">{k}</span>
            <span className="font-mono font-semibold text-white">{counts[k] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
