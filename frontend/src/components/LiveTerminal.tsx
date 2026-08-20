import { useEffect, useRef } from 'react';
import type { ScanEvent } from '../lib/types';

const LEVEL_STYLE: Record<string, string> = {
  INFO: 'text-slate-400',
  AI: 'text-violet-400',
  EXEC: 'text-cyan-400',
  RUN: 'text-slate-500',
  VERIFY: 'text-amber-300',
  GATE: 'text-emerald-400',
  CRITICAL: 'text-rose-400',
  HIGH: 'text-orange-400',
  MEDIUM: 'text-amber-300',
  LOW: 'text-sky-400',
};

export default function LiveTerminal({
  events,
  live,
  height = 'h-[420px]',
}: {
  events: ScanEvent[];
  live?: boolean;
  height?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [events.length]);

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#04060b]">
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0a101c] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        <span className="ml-2 font-mono text-xs text-slate-500">redqa-runner — execution log</span>
        {live && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-300">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-cyan-400" /> Live
          </span>
        )}
      </div>
      <div ref={ref} className={`${height} overflow-y-auto p-4 font-mono text-[12.5px] leading-relaxed`}>
        {events.length === 0 && <p className="text-slate-600">Waiting for runner…</p>}
        {events.map((e, i) => {
          const style = LEVEL_STYLE[e.level] || 'text-slate-400';
          const gateFail = e.level === 'GATE' && e.message.includes('FAIL');
          return (
            <div key={`${e.id}-${i}`} className="flex gap-3 whitespace-pre-wrap py-0.5">
              <span className="shrink-0 text-slate-600">
                {new Date(e.ts).toLocaleTimeString('en-GB')}
              </span>
              <span className={`w-[72px] shrink-0 font-bold ${gateFail ? 'text-rose-400' : style}`}>
                {e.level}
              </span>
              <span className={gateFail ? 'text-rose-300' : e.level === 'RUN' ? 'text-slate-500' : 'text-slate-300'}>
                {e.message}
              </span>
            </div>
          );
        })}
        {live && <span className="terminal-caret text-cyan-400">▊</span>}
      </div>
    </div>
  );
}
