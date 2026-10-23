import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, AlertOctagon, AlertTriangle, Info, CheckCheck, BellOff, Trash2,
  ChevronDown, ChevronRight, TrendingDown, Cpu, Timer, ListChecks, CircleCheck,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { engine, timeAgo, type AnomalySeverity, type AnomalyStatus } from '../lib/engine';
import { useToast } from '../components/ui';

type Filter = 'all' | AnomalyStatus;
type SevFilter = 'all' | AnomalySeverity;

const SEV_META: Record<AnomalySeverity, { icon: typeof AlertOctagon; cls: string; bar: string; label: string }> = {
  critical: { icon: AlertOctagon, cls: 'text-rose-400 border-rose-500/40 bg-rose-500/10', bar: '#f43f5e', label: 'CRITICAL' },
  warning: { icon: AlertTriangle, cls: 'text-gold border-gold/40 bg-gold/10', bar: '#ffd84d', label: 'WARNING' },
  info: { icon: Info, cls: 'text-violet-soft border-violet-core/40 bg-violet-core/10', bar: '#a78bfa', label: 'INFO' },
};

export default function AnomalyCenter() {
  const snap = useEngine();
  const { push } = useToast();
  const [status, setStatus] = useState<Filter>('all');
  const [sev, setSev] = useState<SevFilter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => snap.anomalies.filter(a => (status === 'all' || a.status === status) && (sev === 'all' || a.severity === sev)),
    [snap.anomalies, status, sev],
  );
  const counts = {
    critical: snap.anomalies.filter(a => a.severity === 'critical' && a.status !== 'resolved').length,
    warning: snap.anomalies.filter(a => a.severity === 'warning' && a.status !== 'resolved').length,
    info: snap.anomalies.filter(a => a.severity === 'info' && a.status !== 'resolved').length,
    active: snap.anomalies.filter(a => a.status === 'active').length,
    acknowledged: snap.anomalies.filter(a => a.status === 'acknowledged').length,
    resolved: snap.anomalies.filter(a => a.status === 'resolved').length,
  };
  const silenced = snap.silencedUntil !== null && snap.silencedUntil > Date.now();

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-16 mesh-hero">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold flex items-center gap-2"><ShieldAlert size={13} /> Failure & Drift Intelligence</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">Anomaly <span className="gradient-text">Center</span></h1>
            <p className="text-[12.5px] text-violet-mist/70 mt-1.5">Streaming z-score + seasonal decomposition across 40 signal classes — evaluated on every 100ms control tick.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => { engine.silenceAnomalies(60); push('info', 'Notifications silenced', 'Detection continues — banners suppressed for 60s.'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-line2 text-[11.5px] font-semibold text-violet-mist hover:text-white hover:border-violet-soft/50 transition-all">
              <BellOff size={14} /> Silence 60s{silenced && <span className="text-gold-soft font-mono text-[9px]">ACTIVE</span>}
            </button>
            <button onClick={() => { engine.acknowledgeAll(); push('success', 'All active incidents acknowledged'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-gold/35 text-gold text-[11.5px] font-semibold hover:bg-gold/10 transition-all">
              <CheckCheck size={14} /> Acknowledge all
            </button>
            <button onClick={() => { engine.clearResolved(); push('info', 'Resolved incidents purged'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-line2 text-[11.5px] font-semibold text-violet-mist hover:text-white transition-all">
              <Trash2 size={14} /> Clear resolved
            </button>
          </div>
        </div>

        {/* severity counters */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(['critical', 'warning', 'info'] as AnomalySeverity[]).map(s => {
            const M = SEV_META[s];
            const n = counts[s];
            return (
              <button key={s} onClick={() => setSev(sev === s ? 'all' : s)} aria-pressed={sev === s}
                className={`rounded-2xl border p-4 sm:p-5 text-left transition-all duration-300 ${sev === s ? M.cls + ' scale-[1.02] shadow-lg' : 'border-line bg-panel hover:border-line2'}`}>
                <div className="flex items-center justify-between">
                  <M.icon size={20} className={M.cls.split(' ')[0]} />
                  <span className="font-display text-3xl sm:text-4xl font-bold text-white tabular-nums">{n}</span>
                </div>
                <div className="font-mono text-[9px] sm:text-[9.5px] tracking-[0.22em] text-violet-mist/70 mt-2">{M.label} OPEN</div>
              </button>
            );
          })}
        </div>

        {/* status filter tabs + error budget */}
        <div className="grid lg:grid-cols-12 gap-5 mb-6">
          <div className="lg:col-span-8 glass rounded-2xl p-4 flex flex-wrap items-center gap-2">
            <ListChecks size={16} className="text-gold ml-1" />
            {([['all', 'All', snap.anomalies.length], ['active', 'Active', counts.active], ['acknowledged', 'Acknowledged', counts.acknowledged], ['resolved', 'Resolved', counts.resolved]] as [Filter, string, number][]).map(([k, label, n]) => (
              <button key={k} onClick={() => setStatus(k)}
                className={`h-9 px-4 rounded-xl text-[11.5px] font-semibold transition-all ${status === k ? 'bg-gold text-[#241a05] shadow-[0_0_18px_rgba(255,216,77,0.35)]' : 'text-violet-mist/80 border border-line hover:border-gold/40 hover:text-gold'}`}>
                {label} <span className="font-mono text-[9.5px] opacity-75">{n}</span>
              </button>
            ))}
            <span className="ml-auto font-mono text-[9.5px] text-violet-mist/50">{filtered.length} SHOWN · LIVE FEED</span>
          </div>
          <div className="lg:col-span-4 glass rounded-2xl px-5 py-3.5 flex items-center gap-4">
            <TrendingDown size={18} className="text-gold shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-violet-mist/60">Error budget · 30d</span>
                <span className="font-mono text-[10px] text-gold-soft">{snap.errorRate.toFixed(2)}% burn</span>
              </div>
              <div className="h-2.5 rounded-full bg-violet-core/15 mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-gold-deep via-gold to-gold-soft transition-all duration-700 relative" style={{ width: `${Math.min(100, snap.errorRate * 28 + 4)}%` }}>
                  <div className="absolute inset-0 shimmer opacity-70" />
                </div>
              </div>
              <p className="font-mono text-[8px] text-violet-mist/45 mt-1">1.0% budget · {snap.errorRate < 1 ? 'healthy headroom' : 'BUDGET AT RISK'}</p>
            </div>
          </div>
        </div>

        {/* incident feed */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map(a => {
              const M = SEV_META[a.severity];
              const isOpen = expanded === a.id;
              const isResolved = a.status === 'resolved';
              return (
                <motion.div key={a.id} layout initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -60 }}
                  className={`rounded-2xl border bg-panel/70 overflow-hidden ${isResolved ? 'border-line opacity-60' : a.severity === 'critical' ? 'border-rose-500/40' : 'border-line'}`}>
                  <div className="flex items-stretch">
                    <div className="w-1.5 shrink-0" style={{ background: SEV_META[a.severity].bar, opacity: isResolved ? 0.3 : 0.9 }} />
                    <div className="flex-1 px-4 sm:px-5 py-4">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <M.icon size={20} className={`${M.cls.split(' ')[0]} mt-0.5 shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <h3 className="font-display text-[13.5px] sm:text-[14px] font-semibold text-white/95 leading-snug">{a.title}</h3>
                            <span className={`font-mono text-[8px] px-1.5 py-0.5 rounded border ${a.status === 'active' ? 'text-rose-300 border-rose-400/40 animate-pulse' : a.status === 'acknowledged' ? 'text-gold border-gold/35' : 'text-emerald-400 border-emerald-400/30'}`}>{a.status.toUpperCase()}</span>
                          </div>
                          <p className="font-mono text-[9px] text-violet-mist/50 mt-1.5">{a.metric} · {timeAgo(a.ts)} · detected by ds-anomaly-engine v2.4</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {a.status === 'active' && (
                            <button onClick={() => engine.acknowledgeAnomaly(a.id)} className="h-8 px-2.5 sm:px-3 rounded-lg text-[10px] font-semibold text-gold border border-gold/35 hover:bg-gold/10 transition-all">ACK</button>
                          )}
                          {a.status !== 'resolved' && (
                            <button onClick={() => engine.resolveAnomaly(a.id)} className="h-8 px-2.5 sm:px-3 rounded-lg text-[10px] font-semibold text-emerald-300 border border-emerald-400/30 hover:bg-emerald-500/10 transition-all">RESOLVE</button>
                          )}
                          <button onClick={() => setExpanded(isOpen ? null : a.id)} aria-expanded={isOpen} aria-label="Toggle incident detail"
                            className="h-8 w-8 grid place-items-center rounded-lg border border-line text-violet-mist/70 hover:text-white transition-all">
                            {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        </div>
                      </div>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3 }}>
                            <div className="mt-4 ml-8 sm:ml-9 rounded-xl border border-line bg-obsidian/60 p-4">
                              <p className="text-[11.5px] leading-relaxed text-violet-mist/85">{a.detail}</p>
                              <div className="grid grid-cols-3 gap-2 mt-3 font-mono text-[8.5px] text-violet-mist/60">
                                <div className="rounded-lg border border-line/70 bg-panel px-2.5 py-2"><span className="text-gold/80">RUNBOOK</span><br />runbooks/{a.metric.split('.')[0]}.md</div>
                                <div className="rounded-lg border border-line/70 bg-panel px-2.5 py-2"><span className="text-gold/80">OWNER</span><br />sre-streaming · P2</div>
                                <div className="rounded-lg border border-line/70 bg-panel px-2.5 py-2"><span className="text-gold/80">DETECTOR</span><br />z-score · window 60s</div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/5 py-14 text-center">
              <CircleCheck size={34} className="mx-auto text-emerald-400" />
              <p className="font-display font-semibold text-white mt-3">All clear</p>
              <p className="font-mono text-[10px] text-violet-mist/55 mt-1">No incidents match this filter. The river runs clean.</p>
            </div>
          )}
        </div>

        {/* signal classes */}
        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {[
            { icon: Cpu, t: 'Resource Saturation', d: 'CPU > 80% · heap > 85% · lag > 350 offsets — sustained for one full evaluation window.', n: snap.cpu > 80 ? 'AT LIMIT' : 'NOMINAL' },
            { icon: Timer, t: 'Latency Drift', d: 'p95 crossing 120ms SLO or ±30% deviation from trailing 24h seasonal baseline.', n: snap.p95 > 120 ? 'DRIFTING' : 'NOMINAL' },
            { icon: AlertTriangle, t: 'Failure Cascades', d: 'DLQ flood, circuit-breaker trips, poison-pill loops and schema-evolution breakage.', n: snap.circuitOpen ? 'BREAKER OPEN' : 'NOMINAL' },
          ].map((s, i) => (
            <div key={i} className="glass rounded-2xl p-5">
              <s.icon size={19} className="text-gold" />
              <h3 className="font-display font-semibold text-white text-[14px] mt-2.5">{s.t}</h3>
              <p className="text-[11px] leading-relaxed text-violet-mist/70 mt-1.5">{s.d}</p>
              <span className={`inline-block mt-3 font-mono text-[8.5px] tracking-[0.2em] px-2 py-1 rounded border ${s.n === 'NOMINAL' ? 'text-emerald-400 border-emerald-400/30' : 'text-rose-400 border-rose-400/40 animate-pulse'}`}>{s.n}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
