import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, Upload, Cog, Database, BarChart3, Zap, Skull, HeartPulse,
  GitBranch, AlertOctagon, Radio, ChevronRight, Timer, Wind, ShieldCheck, ListRestart,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { engine, fmtCompact } from '../lib/engine';
import FlowCanvas from '../components/FlowCanvas';
import { AreaChart, RadialGauge } from '../components/charts';
import { useToast } from '../components/ui';

const STAGES = [
  { name: 'Ingestion Gateway', detail: 'ws + HTTP batch ingress · schema registry STAMP', quota: '50K evt/s cap', icon: Upload },
  { name: 'Redpanda Broker', detail: 'Topic ds.events.v7 · 6 partitions · 3-zone RF', quota: 'log-compacted', icon: GitBranch },
  { name: 'WASM Transform', detail: 'enrich → aggregate → score · exactly-once', quota: '4.2ms median exec', icon: Cog },
  { name: 'Postgres Sink', detail: 'transactional COPY + idempotent upsert', quota: 'checkpointed 214M', icon: Database },
];
const ANALYTICS_TARGETS = ['Anomaly Radar', 'Revenue Rollup', 'SLO Watchdog', 'Board Report', 'Slack Alerts'];

export default function Pipeline() {
  const snap = useEngine();
  const { push } = useToast();
  const [rate, setRate] = useState(snap.eventsPerSec);
  const [logLines, setLogLines] = useState<string[]>([]);

  useEffect(() => { engine.start(); }, []);

  // stream synthetic structured logs from live events
  useEffect(() => {
    if (!snap.running) return;
    const latest = snap.events[0];
    if (!latest) return;
    setLogLines(prev => {
      const line = `${new Date(latest.ts).toISOString().slice(11, 23)}  ingest=${latest.type}  region=${latest.region}  lat=${latest.latencyMs}ms  amt=${latest.amount > 0 ? `$${latest.amount.toFixed(2)}` : '0.00'}  → ${latest.status === 'ok' ? 'COMMIT' : 'NACK→DLQ'}`;
      if (prev[0] === line) return prev;
      return [line, ...prev].slice(0, 9);
    });
  }, [snap.events, snap.running]);

  const hist = snap.history.slice(-48);
  const avgP50 = Math.round(hist.reduce((a, h) => a + h.p50, 0) / (hist.length || 1));
  const budgetPct = Math.min(100, (avgP50 / 120) * 100);
  const kill = (i: 0 | 1 | 2 | 3) => {
    engine.destroyStage(i);
    push('warning', `Chaos: ${STAGES[i].name} destroyed`, 'Watch throughput collapse and the circuit breaker react.');
  };
  const heal = (i: 0 | 1 | 2 | 3) => {
    engine.healStage(i);
    push('success', `${STAGES[i].name} restored`, 'Offsets resume from last committed position — zero data loss.');
  };

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-16 mesh-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold flex items-center gap-2"><Radio size={13} /> Interactive Simulator</div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">Stream <span className="gradient-text">Simulator</span></h1>
            <p className="text-[12.5px] text-violet-mist/70 mt-1.5 max-w-xl">Inject a live event storm, then destroy pipeline stages and drill the transforms — watch ingestion → Redpanda → WASM → Postgres react in real time.</p>
          </div>
          <button onClick={() => (snap.running ? engine.pause() : engine.start())}
            className={`h-11 px-6 inline-flex items-center gap-2 rounded-xl font-bold text-[12.5px] transition-all ${snap.running
              ? 'border border-gold/35 text-gold bg-gold/5 hover:bg-gold/10'
              : 'bg-gradient-to-r from-gold-soft to-gold-deep text-[#241a05] shadow-[0_0_28px_rgba(255,216,77,0.4)]'}`}>
            {snap.running ? <><Pause size={16} /> PAUSE EVENT STORM</> : <><Play size={16} /> INJECT EVENT STORM</>}
          </button>
        </div>

        {/* ── injection controls ─────────────────────────────────── */}
        <div className="glass rounded-2xl p-4 sm:p-5 mb-5 grid lg:grid-cols-12 gap-5 items-center">
          <div className="lg:col-span-5">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="rate" className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-mist/75 flex items-center gap-2"><Zap size={12} className="text-gold" /> Event injection rate</label>
              <span className="font-display text-lg font-bold text-gold-soft tabular-nums">{rate.toLocaleString()}<span className="text-[10px] font-mono text-violet-mist/60"> evt/s</span></span>
            </div>
            <input id="rate" type="range" min={100} max={8000} step={100} value={rate}
              onChange={e => { const v = Number(e.target.value); setRate(v); engine.setRate(v); }}
              className="ds-range w-full" style={{ ['--fill' as string]: `${((rate - 100) / 7900) * 100}%` }} />
            <div className="flex justify-between font-mono text-[8.5px] text-violet-mist/45 mt-1"><span>100</span><span>2,000</span><span>4,000</span><span>6,000</span><span>8,000</span></div>
          </div>
          <div className="lg:col-span-7 flex flex-wrap gap-2.5 lg:justify-end">
            <button onClick={() => { engine.injectSpike(); push('warning', 'Traffic spike injected', '3.2× baseline for 40 ticks · autoscaler adding consumer replicas.'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-[11.5px] font-semibold text-violet-mist border border-violet-core/40 bg-violet-deep/15 hover:bg-violet-deep/30 hover:text-white transition-all">
              <Wind size={15} /> Inject 3.2× Spike
            </button>
            <button onClick={() => { engine.injectFailure(); push('warning', 'Failure storm injected', '30s burst of downstream timeouts · watch circuit breaker.'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-[11.5px] font-semibold text-rose-300 border border-rose-400/35 bg-rose-500/10 hover:bg-rose-500/20 transition-all">
              <AlertOctagon size={15} /> Inject Failure Storm
            </button>
            <button onClick={() => { engine.healStage(0); engine.healStage(1); engine.healStage(2); engine.healStage(3); push('success', 'Full recovery drill complete', 'All stages healthy · lag draining · offsets committed.'); }}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl text-[11.5px] font-semibold text-emerald-300 border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all">
              <ShieldCheck size={15} /> Heal All Stages
            </button>
          </div>
        </div>

        {/* ── flow canvas ────────────────────────────────────────── */}
        <FlowCanvas height={235} density={1.15} />

        {/* ── stage cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {STAGES.map((s, i) => {
            const alive = snap.alive[i];
            const lag = i === 1 ? snap.kafkaLag : i === 2 ? Math.round(snap.cpu) : i === 3 ? Math.round(100 - budgetPct / 2) : Math.round(100 - snap.cpu * 0.4);
            return (
              <div key={i} className={`rounded-2xl border p-4 transition-all duration-500 ${alive ? 'border-line bg-panel' : 'border-rose-500/45 bg-rose-950/25 shadow-[0_0_30px_rgba(244,63,94,0.12)]'}`}>
                <div className="flex items-center justify-between">
                  <s.icon size={19} strokeWidth={1.7} className={alive ? 'text-gold' : 'text-rose-400'} />
                  <span className={`flex items-center gap-1.5 font-mono text-[8.5px] tracking-[0.18em] ${alive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${alive ? 'bg-emerald-400' : 'bg-rose-400 animate-ping'}`} />{alive ? 'HEALTHY' : 'OFFLINE'}
                  </span>
                </div>
                <h3 className="font-display font-semibold text-[13px] text-white mt-2.5 leading-tight">{s.name}</h3>
                <p className="font-mono text-[8.5px] text-violet-mist/55 mt-1 leading-snug">{s.detail}</p>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line/70">
                  <span className="font-mono text-[8.5px] text-violet-mist/55">{s.quota}</span>
                  <button onClick={() => (alive ? kill(i as 0 | 1 | 2 | 3) : heal(i as 0 | 1 | 2 | 3))}
                    className={`h-7 px-2.5 rounded-lg font-mono text-[9px] font-bold tracking-wider inline-flex items-center gap-1.5 transition-all ${alive
                      ? 'text-rose-300 border border-rose-400/35 hover:bg-rose-500/15'
                      : 'text-emerald-300 border border-emerald-400/35 hover:bg-emerald-500/15'}`}
                    aria-label={alive ? `Destroy ${s.name}` : `Heal ${s.name}`}>
                    {alive ? <><Skull size={11} /> KILL</> : <><HeartPulse size={11} /> HEAL</>}
                  </button>
                </div>
                {!alive && <div className="mt-2 font-mono text-[8px] text-rose-400/80">FAILOVER REPLICA PROMOTED · RPO 0 · RTO 800ms</div>}
                {i === 1 && alive && lag > 0 && <div className="mt-2 font-mono text-[8px] text-gold/75">LAG {lag} OFFSETS · HEALING…</div>}
              </div>
            );
          })}
        </div>

        {/* ── analytics fanout + latency + logs ─────────────────────── */}
        <div className="grid lg:grid-cols-12 gap-5 mt-5">
          <div className="lg:col-span-4 glass rounded-2xl p-5">
            <h2 className="font-display font-semibold text-white flex items-center gap-2 text-[15px]"><BarChart3 size={16} className="text-gold" /> Analytics Fanout</h2>
            <p className="font-mono text-[9px] text-violet-mist/55 mt-1 mb-4">WHO CONSUMES THE COMMITTED STREAM</p>
            <div className="space-y-2.5">
              {ANALYTICS_TARGETS.map((t, i) => (
                <div key={t} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-3.5 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-gold animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                  <span className="text-[11.5px] text-violet-mist/90">{t}</span>
                  <span className="ml-auto font-mono text-[9.5px] text-emerald-400">{(28 + i * 7 + (Date.now() / 1000 + i * 3) % 9).toFixed(0)}ms</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-line flex items-center justify-between">
              <RadialGauge value={budgetPct} max={100} label={`${avgP50}`} sublabel="p50 ms · BUDGET 120" size={96} color={budgetPct > 78 ? '#f43f5e' : '#ffd84d'} />
              <div className="text-right">
                <div className="font-mono text-[9px] text-violet-mist/55 uppercase tracking-wider">Circuit Breaker</div>
                <div className={`font-display text-lg font-bold mt-0.5 ${snap.finiteState === 'CLOSED' ? 'text-emerald-400' : snap.finiteState === 'HALF_OPEN' ? 'text-gold' : 'text-rose-400'}`}>{snap.finiteState.replace('_', '-')}</div>
                <div className="font-mono text-[8.5px] text-violet-mist/50 mt-1">trips at 20% err · 5s cooldown</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 glass rounded-2xl p-5">
            <h2 className="font-display font-semibold text-white flex items-center gap-2 text-[15px]"><Timer size={16} className="text-gold" /> Processing Latency</h2>
            <p className="font-mono text-[9px] text-violet-mist/55 mt-1 mb-2">ROLLING p50 / p95 / p99 · 60s WINDOW</p>
            <AreaChart height={190} formatY={v => `${Math.round(v)}ms`}
              data={[hist.map(h => h.p50), hist.map(h => h.p95), hist.map(h => h.p99)]}
              series={[{ name: 'p50', color: '#ffd84d', fill: false }, { name: 'p95', color: '#a78bfa', fill: false }, { name: 'p99', color: '#f43f5e', fill: false }]} />
            <div className="flex items-center gap-4 font-mono text-[9.5px] text-violet-mist/60 mt-2">
              <span><span className="text-gold">—</span> p50 {snap.p50}ms</span>
              <span><span className="text-violet-soft">—</span> p95 {snap.p95}ms</span>
              <span><span className="text-rose-400">—</span> p99 {snap.p99}ms</span>
            </div>
          </div>

          <div className="lg:col-span-4 glass rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-line">
              <h2 className="font-display font-semibold text-white text-[15px] flex items-center gap-2"><ListRestart size={15} className="text-gold" /> Structured Logs</h2>
              <span className="font-mono text-[8.5px] text-emerald-400/80">tail -f ds-transform-prod</span>
            </div>
            <div className="p-4 font-mono text-[9px] leading-[1.75] text-emerald-300/80 overflow-hidden flex-1 min-h-[190px]">
              {logLines.map((l, i) => (
                <div key={i} className={`whitespace-nowrap ${i === 0 ? 'text-gold-soft' : ''}`} style={{ opacity: 1 - i * 0.11 }}>{l}</div>
              ))}
              {logLines.length === 0 && <div className="text-violet-mist/40">waiting for committed offsets…</div>}
              <span className="inline-block w-2 h-3.5 bg-emerald-400/80 animate-pulse align-middle" />
            </div>
          </div>
        </div>

        {/* explained strip */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 font-mono text-[9.5px] tracking-[0.18em] text-violet-mist/55">
          {['INGEST', 'BRIDGE', 'TRANSFORM', 'PERSIST', 'QUERY'].map((s, i) => (
            <span key={s} className="flex items-center gap-2"><span className={i < 4 ? 'text-gold/80' : 'text-violet-soft'}>{s}</span>{i < 4 && <ChevronRight size={11} />}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
