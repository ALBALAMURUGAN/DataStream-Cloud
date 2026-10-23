import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Zap, Activity, Gauge, Database, ShoppingCart, Percent,
  Pause, Play, Layers, Server, ChevronRight, Download,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { engine, fmtCompact, fmtMoney } from '../lib/engine';
import { AreaChart, Donut, HBar, RadialGauge, Sparkline } from '../components/charts';
import { KpiCard, useToast } from '../components/ui';
import FlowCanvas from '../components/FlowCanvas';

const REGIONS = [
  { name: 'us-east-1', label: 'N. Virginia' }, { name: 'eu-west-1', label: 'Ireland' },
  { name: 'ap-south-1', label: 'Mumbai' }, { name: 'sa-east-1', label: 'São Paulo' },
];

export default function Console() {
  const snap = useEngine();
  const { push } = useToast();
  const [rate, setRate] = useState(snap.eventsPerSec);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  useEffect(() => { setRate(snap.eventsPerSec); }, [snap.eventsPerSec]);
  useEffect(() => { engine.start(); }, []);

  const hist = snap.history.slice(-48);
  const filteredEvents = snap.events.filter(e =>
    (eventFilter === 'all' || e.type === eventFilter) &&
    (!query || e.id.includes(query.toLowerCase()) || e.region.includes(query.toLowerCase()))
  );
  const typeTotal = Object.values(snap.typeDistribution).reduce((a, b) => a + b, 0) || 1;
  const COLORS: Record<string, string> = { page_view: '#a78bfa', api_call: '#8b5cf6', purchase: '#ffd84d', signup: '#f5b301', refund: '#f43f5e' };

  const exportCsv = () => {
    const header = 'id,ts,type,region,amount,latencyMs,status,source\n';
    const body = snap.rows.map(r => [r.id, new Date(r.ts).toISOString(), r.type, r.region, r.amount, r.latencyMs, r.status, r.source].join(',')).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'datastream-processed-export.csv'; a.click();
    URL.revokeObjectURL(url);
    push('success', 'Export started', `${snap.rows.length} processed rows → datastream-processed-export.csv`);
  };

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-16 mesh-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* header row */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold flex items-center gap-2">
              <span className="relative flex w-2 h-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" /><span className="relative inline-flex w-2 h-2 rounded-full bg-gold" /></span>
              Production · workspace ds-prod-01
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">Live Analytics <span className="gradient-text">Console</span></h1>
            <p className="text-[12.5px] text-violet-mist/70 mt-1.5 font-mono">ws://streams.datastream.cloud/v1/fanout · <span className="text-emerald-400">● connected</span> · TLS 1.3 · exactly-once</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportCsv}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl border border-line2 text-[12px] font-semibold text-violet-mist hover:text-gold hover:border-gold/40 transition-all">
              <Download size={15} /> Export CSV
            </button>
            <button onClick={() => (snap.running ? engine.pause() : engine.start())}
              className={`h-10 px-5 inline-flex items-center gap-2 rounded-xl text-[12px] font-bold tracking-wide transition-all ${snap.running
                ? 'bg-panel2 border border-gold/35 text-gold hover:bg-gold/10'
                : 'bg-gradient-to-r from-gold-soft to-gold-deep text-[#241a05] shadow-[0_0_24px_rgba(255,216,77,0.35)]'}`}>
              {snap.running ? <><Pause size={15} /> PAUSE STREAM</> : <><Play size={15} /> RESUME STREAM</>}
            </button>
          </div>
        </div>

        {/* rate control */}
        <div className="glass rounded-2xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Zap size={17} className="text-gold" />
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-violet-mist/75">Injection Rate</span>
          </div>
          <input type="range" min={100} max={6000} step={100} value={rate} aria-label="Events per second"
            onChange={e => { const v = Number(e.target.value); setRate(v); engine.setRate(v); }}
            className="ds-range flex-1" style={{ ['--fill' as string]: `${((rate - 100) / 5900) * 100}%` }} />
          <div className="font-display text-xl font-bold text-gold-soft tabular-nums w-28 text-right">{rate.toLocaleString()} <span className="text-[11px] font-mono text-violet-mist/60">evt/s</span></div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <KpiCard label="Events/sec" value={fmtCompact(snap.actualEps || snap.eventsPerSec)} unit="live" delta="▲ +4.2% vs 1h ago" deltaUp icon={Zap} accent="gold" spark={<Sparkline data={hist.map(h => h.ingest)} color="#ffd84d" width={84} height={28} />} />
          <KpiCard label="p99 Latency" value={`${snap.p99}`} unit="ms" delta={snap.p99 < 150 ? 'within SLO 150ms' : 'SLO breach risk'} deltaUp={snap.p99 < 150} icon={Gauge} accent="violet" spark={<Sparkline data={hist.map(h => h.p99)} color="#a78bfa" width={84} height={28} />} />
          <KpiCard label="Processed (total)" value={fmtCompact(snap.totalProcessed)} unit="events" delta="+1.9M today" deltaUp icon={Layers} accent="gold" spark={<Sparkline data={hist.map(h => h.processed)} color="#ffd84d" width={84} height={28} />} />
          <KpiCard label="Revenue Tracked" value={fmtMoney(snap.revenueTotal)} delta="▲ live purchase stream" deltaUp icon={ShoppingCart} accent="violet" spark={<Sparkline data={hist.map(h => h.processed * 6.4)} color="#c4b5fd" width={84} height={28} />} />
        </div>

        <div className="grid xl:grid-cols-3 gap-5">
          {/* ── main throughput chart ── */}
          <div className="xl:col-span-2 glass rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-display font-semibold text-white flex items-center gap-2"><Activity size={16} className="text-gold" /> Ingestion vs Processing</h2>
              <span className="font-mono text-[9.5px] text-violet-mist/55">60s WINDOW · 1s ROLLUP</span>
            </div>
            <AreaChart
              data={[hist.map(h => h.ingest), hist.map(h => h.processed), hist.map(h => h.failed * 18)]}
              series={[{ name: 'Ingested', color: '#a78bfa' }, { name: 'Processed', color: '#ffd84d' }, { name: 'Failed ×18', color: '#f43f5e', fill: false }]}
              height={205} formatY={v => fmtCompact(v)} />
            <div className="flex items-center gap-5 font-mono text-[9.5px] text-violet-mist/65 mt-2">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-soft" />INGESTED</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold" />PROCESSED</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />FAILED ×18</span>
            </div>
          </div>

          {/* ── health gauges ── */}
          <div className="glass rounded-2xl p-5 sm:p-6 grid grid-cols-2 content-center gap-4">
            <RadialGauge value={snap.cpu} max={100} label={`${snap.cpu}%`} sublabel="EXECUTOR CPU" color="#ffd84d" size={118} thresholds={[{ at: 80, color: '#f43f5e' }]} />
            <RadialGauge value={snap.mem} max={100} label={`${snap.mem}%`} sublabel="HEAP / RSS" color="#a78bfa" size={118} thresholds={[{ at: 85, color: '#f43f5e' }]} />
            <RadialGauge value={Math.min(snap.kafkaLag, 500)} max={500} label={`${snap.kafkaLag}`} sublabel="CONSUMER LAG" color={snap.kafkaLag > 300 ? '#f43f5e' : '#ffd84d'} size={118} thresholds={[{ at: 350, color: '#f43f5e' }]} />
            <RadialGauge value={snap.successRate} max={100} label={`${snap.successRate.toFixed(2)}%`} sublabel="DELIVERY SUCCESS" color="#34d399" size={118} />
          </div>

          {/* ── live event firehose ── */}
          <div className="xl:col-span-2 glass rounded-2xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3 border-b border-line">
              <h2 className="font-display font-semibold text-white text-[15px] mr-auto">Event Firehose</h2>
              <select value={eventFilter} onChange={e => setEventFilter(e.target.value)} aria-label="Filter event type"
                className="h-8 rounded-lg bg-panel2 border border-line2 text-[11px] font-mono text-violet-mist px-2 focus:outline-none focus:border-gold/40">
                {['all', 'purchase', 'page_view', 'signup', 'refund', 'api_call'].map(t => <option key={t} value={t}>{t === 'all' ? 'ALL TYPES' : t.toUpperCase().replace('_', ' ')}</option>)}
              </select>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="filter id / region…" aria-label="Filter events"
                className="h-8 w-40 rounded-lg bg-panel2 border border-line2 text-[11px] font-mono text-violet-mist px-2.5 placeholder:text-violet-mist/35 focus:outline-none focus:border-gold/40" />
            </div>
            <div className="overflow-auto max-h-[300px]">
              <table className="w-full text-[11px] font-mono">
                <thead className="sticky top-0 bg-panel2/95 backdrop-blur text-violet-mist/60 text-[9px] uppercase tracking-wider">
                  <tr>{['Event', 'Type', 'Region', 'Amount', 'Lat', 'Status'].map(h => <th key={h} className="text-left px-4 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {filteredEvents.slice(0, 22).map(e => (
                    <tr key={e.id} className="border-t border-line/50 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-1.5 text-violet-mist/80">{e.id}</td>
                      <td className="px-4 py-1.5"><span className="text-gold-soft/90">{e.type}</span></td>
                      <td className="px-4 py-1.5 text-violet-mist/70">{e.region}</td>
                      <td className="px-4 py-1.5 text-white/85">{e.amount > 0 ? `$${e.amount.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-1.5 text-violet-mist/70">{e.latencyMs}ms</td>
                      <td className="px-4 py-1.5">{e.status === 'ok'
                        ? <span className="text-emerald-400">● OK</span>
                        : <span className="text-rose-400">● FAIL</span>}</td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-violet-mist/45">No events match “{query}”</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── distribution + partitions ── */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-4">
            <h2 className="font-display font-semibold text-white text-[15px] flex items-center gap-2"><Percent size={15} className="text-gold" /> Event Mix · 24h</h2>
            <div className="flex items-center gap-5">
              <Donut size={118} thickness={15} centerValue={fmtCompact(typeTotal)} centerLabel="EVENTS"
                segments={Object.entries(snap.typeDistribution).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, color: COLORS[k] || '#666' }))} />
              <ul className="flex-1 space-y-1.5">
                {Object.entries(snap.typeDistribution).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => (
                  <li key={k} className="flex items-center gap-2 text-[10.5px] font-mono">
                    <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: COLORS[k] }} />
                    <span className="text-violet-mist/80 truncate">{k}</span>
                    <span className="ml-auto text-white/75">{((v / typeTotal) * 100).toFixed(1)}%</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="pt-3 border-t border-line">
              <h3 className="font-mono text-[9px] uppercase tracking-[0.22em] text-violet-mist/60 mb-2 flex items-center justify-between"><span className="flex items-center gap-1.5"><Layers size={11} /> Topic ds.events.v7 · 6 partitions</span><span className="text-gold/80">OFFSET ∞→</span></h3>
              <div className="grid grid-cols-3 gap-1.5">
                {snap.partitions.map((p, i) => (
                  <div key={i} className="rounded-lg border border-line bg-panel px-2 py-1.5 text-center">
                    <div className="font-mono text-[8px] text-violet-mist/50">P{i}</div>
                    <div className="font-mono text-[10px] text-gold-soft/90 tabular-nums">{fmtCompact(p)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* regional load */}
        <div className="glass rounded-2xl p-5 sm:p-6 mt-5">
          <h2 className="font-display font-semibold text-white flex items-center gap-2 mb-4"><Server size={16} className="text-gold" /> Regional Load Distribution <span className="font-mono text-[9px] text-violet-mist/55 font-normal ml-2">SHARE OF PROCESSED EVENTS · LAST 60s</span></h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-4">
            {REGIONS.map((r, i) => {
              const pct = [34, 27, 22, 17][i] + Math.sin(Date.now() / 4000 + i) * 2;
              return <HBar key={r.name} label={`${r.name} · ${r.label}`} pct={pct} value={`${pct.toFixed(1)}%`} color={i % 2 ? 'linear-gradient(90deg,#8b5cf6,#c4b5fd)' : 'linear-gradient(90deg,#f5b301,#ffe680)'} />;
            })}
          </div>
        </div>

        {/* pipeline flow strip */}
        <div className="glass rounded-2xl p-5 sm:p-6 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-white flex items-center gap-2"><Database size={16} className="text-gold" /> Fabric Flow — Ingestion <ChevronRight size={13} className="text-violet-mist/50" /> Redpanda <ChevronRight size={13} className="text-violet-mist/50" /> Transform <ChevronRight size={13} className="text-violet-mist/50" /> Sink</h2>
            <span className={`font-mono text-[9.5px] px-2 py-1 rounded-md border ${snap.circuitOpen ? 'text-rose-400 border-rose-400/40 bg-rose-400/10' : 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5'}`}>CB: {snap.finiteState.replace('_', ' ')}</span>
          </div>
          <FlowCanvas height={150} density={0.8} />
        </div>
      </div>
    </div>
  );
}
