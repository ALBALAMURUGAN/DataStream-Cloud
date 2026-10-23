import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Play, Zap, Upload, Cog, Database, BarChart3, ShieldAlert, FileDown,
  ChevronDown, CheckCircle2, Waves, Gauge, GitBranch, Radio, ArrowDown, Star,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { fmtCompact, fmtMoney } from '../lib/engine';
import { AreaChart, HBar, Sparkline, Donut } from '../components/charts';
import { SectionHeading } from '../components/ui';

const TICKER_ITEMS = ['ACME RETAIL', 'NORTHWIND LOGISTICS', 'HELIOS ENERGY', 'BLUEBARN FINTECH', 'VERTEX HEALTH', 'QUANTA MEDIA', 'LUMEN TELECOM', 'ORBITAL SHIPPING', 'NOVACARE', 'ZEPHYR AUTOMOTIVE'];

const CAPABILITIES = [
  { icon: Upload, title: 'Universal Ingestion', desc: 'Drop CSV, JSON or stream live events through native connectors — schema registry validates every byte on arrival.', stat: '14ms', statLabel: 'to first byte processed' },
  { icon: Cog, title: 'Streaming Pipeline', desc: 'WASM-compiled transforms, windowed aggregations and exactly-once semantics across 6 topics × 3 zones.', stat: '1.4B', statLabel: 'events processed / day' },
  { icon: BarChart3, title: 'Live Analytics', desc: 'Sub-second materialized views stream to every connected WebSocket client — no refresh, no cron, no staleness.', stat: '<300ms', statLabel: 'write-to-chart latency' },
  { icon: ShieldAlert, title: 'Anomaly Detection', desc: 'Streaming z-score and seasonal-decomposition models flag latency drift, DLQ floods and error-budget burn in real time.', stat: '99.1%', statLabel: 'detection precision' },
  { icon: Database, title: 'Tiered Storage', desc: 'Hot path in Postgres + Redis, warm Parquet on object storage, cold archive in glacier tiers. One SQL dialect.', stat: '7yr', statLabel: 'queryable retention' },
  { icon: FileDown, title: 'Reports & Exports', desc: 'One click renders board-ready PDF/CSV/Excel reports straight from processed result sets — scheduled or on demand.', stat: '40+', statLabel: 'export templates' },
];

const FAQS = [
  { q: 'How is DataStream different from batch ETL tools?', a: 'Batch tools wake up on a schedule and move yesterday’s data. DataStream processes each record the moment it lands — windowed aggregations, anomaly scoring and materialized views update continuously, so dashboards show what is happening now, not what happened at midnight.' },
  { q: 'What happens when a processing stage fails?', a: 'Every stage ships with circuit breakers, a dead-letter queue and automated failover. The circuit breaker trips at >20% error rate, sheds load for a 5-second cooldown, probes half-open, then closes automatically. You’ll see it happen live in the Stream Simulator.' },
  { q: 'Can I bring my own data?', a: 'Yes — the Datasets page accepts CSV and JSON uploads with automatic schema inference, validation against the registry, and quarantine of bad rows to the DLQ. Your file is processed in-browser and appears instantly in every chart and table.' },
  { q: 'Which guarantees does exactly-once give me?', a: 'Idempotent producers, transactional consumer commits and deduplicated sink writes mean every event affects your analytics exactly once — even across rebalances, retries and failovers. No double-counting revenue, ever.' },
  { q: 'How fast can we go from signup to first insight?', a: 'The free tier provisions a full pipeline — ingest topic, transform function, Postgres sink and a live dashboard — in under 90 seconds. No YAML, no Terraform, no ops ticket.' },
];

export default function Home() {
  const snap = useEngine();
  const navigate = useNavigate();
  const [faqOpen, setFaqOpen] = useState(0);

  const historyIngest = snap.history.slice(-40).map(h => h.ingest);
  const epsSpark = snap.history.slice(-24).map(h => h.ingest);
  const typeEntries = Object.entries(snap.typeDistribution);
  const typeTotal = typeEntries.reduce((a, [, v]) => a + v, 0) || 1;

  return (
    <div className="relative">
      {/* ══════════ HERO ══════════ */}
      <section className="relative min-h-[108vh] mesh-hero grid-bg noise overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-[72%_center] sm:bg-center opacity-[0.62]"
          style={{ backgroundImage: 'url(/images/hero-stream.png)' }}
          role="img" aria-label="Golden and violet energy streams flowing through a crystalline data pipeline"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian via-obsidian/78 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/60" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-36 sm:pt-40 lg:pt-44 pb-40">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}
              className="inline-flex items-center gap-2.5 rounded-full border border-gold/30 bg-gold/[0.07] backdrop-blur-sm pl-1.5 pr-4 py-1.5 mb-7">
              <span className="relative flex w-2.5 h-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-70" /><span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-gold" /></span>
              <span className="font-mono text-[10px] sm:text-[10.5px] tracking-[0.18em] text-gold-soft">LIVE · {fmtCompact(snap.actualEps || snap.eventsPerSec)} EVENTS/SEC FLOWING NOW</span>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .1 }}
              className="font-display font-bold tracking-[-0.03em] text-white text-[42px] sm:text-6xl xl:text-[72px] leading-[1.02]">
              Every byte,<br />
              processed<br />
              <span className="gradient-text">in milliseconds.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .22 }}
              className="mt-6 text-[15px] sm:text-[17px] leading-relaxed text-violet-mist/90 max-w-lg">
              DataStream Cloud ingests <span className="text-gold-soft font-semibold">CSV, JSON and streaming events</span>, pushes them through a WASM streaming pipeline, and turns chaos into live, board-ready analytics — before your coffee cools.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .34 }}
              className="mt-9 flex flex-wrap items-center gap-4">
              <button onClick={() => navigate('/console')}
                className="group h-14 pl-7 pr-3 rounded-2xl inline-flex items-center gap-4 font-display font-bold text-[15px] text-[#241a05] bg-gradient-to-br from-gold-soft via-gold to-gold-deep shadow-[0_8px_40px_rgba(245,179,1,0.4),inset_0_1.5px_0_rgba(255,255,255,0.8)] hover:shadow-[0_8px_55px_rgba(245,179,1,0.55)] hover:-translate-y-0.5 active:translate-y-0 transition-all">
                Launch Live Console
                <span className="w-9 h-9 grid place-items-center rounded-xl bg-[#241a05] text-gold group-hover:translate-x-1 transition-transform"><ArrowRight size={17} strokeWidth={2.5} /></span>
              </button>
              <Link to="/pipeline" className="group h-14 px-6 rounded-2xl inline-flex items-center gap-3 border border-violet-core/35 bg-violet-deep/15 backdrop-blur-sm text-[14.5px] font-semibold text-violet-mist hover:text-white hover:border-violet-soft/60 hover:bg-violet-deep/25 transition-all">
                <span className="w-8 h-8 grid place-items-center rounded-full border border-violet-soft/40 group-hover:scale-110 transition-transform"><Play size={12} fill="currentColor" /></span>
                Watch the pipeline think
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .9, delay: .5 }} className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-mono text-violet-mist/60">
              <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold" /> SOC 2 TYPE II</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold" /> EXACTLY-ONCE DELIVERY</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={13} className="text-gold" /> 90s TO FIRST INSIGHT</span>
            </motion.div>
          </div>

          {/* floating KPI chips over hero art */}
          <motion.div initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: .55 }}
            className="hidden md:block absolute right-[6%] top-[34%] xl:right-[10%]">
            <div className="animate-float glass rounded-2xl px-5 py-4 shadow-2xl shadow-violet-deep/40 border-line2">
              <div className="font-mono text-[9px] tracking-[0.2em] text-violet-mist/70 uppercase">Pipeline throughput</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[30px] font-bold text-gold-soft">{fmtCompact(snap.actualEps || snap.eventsPerSec)}</span>
                <span className="font-mono text-[11px] text-violet-mist/75">evt/s</span>
              </div>
              <Sparkline data={epsSpark.length ? epsSpark : [10, 20, 15, 30]} color="#ffd84d" width={150} height={34} />
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 1, delay: .72 }}
            className="hidden md:block absolute right-[20%] xl:right-[24%] top-[56%]">
            <div className="animate-float glass rounded-2xl px-5 py-3.5 shadow-2xl shadow-black/50 border-line2" style={{ animationDelay: '-2.5s' }}>
              <div className="flex items-center gap-3">
                <Gauge size={18} className="text-emerald-400" />
                <div>
                  <div className="font-mono text-[9px] tracking-[0.2em] text-violet-mist/70 uppercase">p99 latency</div>
                  <div className="font-display text-lg font-bold text-white">{snap.p99}<span className="text-[11px] text-violet-mist/70 font-mono"> ms</span></div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* scroll cue */}
        <button onClick={() => document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-violet-mist/70 hover:text-gold transition-colors z-10" aria-label="Scroll to capabilities">
          <span className="font-mono text-[9px] tracking-[0.3em]">SCROLL TO EXPLORE</span>
          <span className="w-6 h-10 rounded-full border border-violet-mist/30 flex items-start justify-center pt-2"><span className="w-1.5 h-1.5 rounded-full bg-gold scroll-cue" /></span>
        </button>

        {/* ticker */}
        <div className="absolute bottom-0 inset-x-0 border-t border-line bg-obsidian/80 backdrop-blur-md h-12 flex items-center overflow-hidden">
          <div className="animate-ticker flex items-center gap-10 whitespace-nowrap">
            {[...TICKER_ITEMS, ...TICKER_ITEMS].map((name, i) => (
              <span key={i} className="flex items-center gap-3 font-mono text-[10.5px] tracking-[0.18em] text-violet-mist/55">
                <span className="w-1.5 h-1.5 rotate-45 bg-gold/70" />{name}<span className="text-violet-mist/30">· 1.4B EVT/DAY</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ LIVE NUMBERS BAND ══════════ */}
      <section className="relative border-b border-line bg-[#0b0818]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { v: fmtCompact(snap.totalProcessed), l: 'events processed', s: 'since cluster birth' },
            { v: fmtMoney(snap.revenueTotal), l: 'revenue analyzed', s: 'across 4 regions live' },
            { v: `${snap.successRate.toFixed(3)}%`, l: 'delivery success', s: 'exactly-once, transactional' },
            { v: '99.99%', l: 'pipeline SLA', s: 'last 13 months, measured' },
          ].map((s, i) => (
            <div key={i} className="text-center md:text-left border-l border-line pl-4 first:border-0">
              <div className="font-display text-xl sm:text-2xl font-bold gold-text">{s.v}</div>
              <div className="text-[11px] font-semibold text-white/85 mt-0.5 uppercase tracking-wide">{s.l}</div>
              <div className="font-mono text-[9px] text-violet-mist/50 mt-0.5">{s.s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════ CAPABILITIES BENTO ══════════ */}
      <section id="capabilities" className="relative py-24 bg-[#08060f] overflow-hidden">
        <div className="absolute top-40 -left-40 w-96 h-96 rounded-full bg-violet-deep/15 blur-[140px]" />
        <div className="absolute bottom-40 -right-40 w-96 h-96 rounded-full bg-gold-deep/10 blur-[140px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Capabilities"
            title={<>Six superpowers,<br /><span className="gradient-text">one flowing fabric.</span></>}
            sub="From the moment a byte lands to the moment your CFO sees the chart — every stage of the DataStream lifecycle, continuously live." />

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }} transition={{ duration: .6, delay: (i % 3) * .12 }}
                className="card-glow rounded-2xl p-6 group relative overflow-hidden">
                <c.icon size={26} strokeWidth={1.6} className="text-gold" />
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{c.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-violet-mist/75 min-h-[72px]">{c.desc}</p>
                <div className="mt-4 pt-4 border-t border-line flex items-baseline gap-2">
                  <span className="font-display text-2xl font-bold text-gold-soft">{c.stat}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-violet-mist/55">{c.statLabel}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS — PIPELINE STEPS ══════════ */}
      <section className="relative py-24 bg-[#0b0818] border-y border-line overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Anatomy of a Record"
            title={<>From raw noise to <span className="gradient-text">revenue signal</span></>}
            sub="Follow a single purchase event through the fabric — the same 4 hops every one of your 1.4B daily events takes." />

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-0">
            {[
              { n: '01', icon: Upload, t: 'Ingest', d: 'WebSocket gateway + HTTP batch APIs accept CSV/JSON/streams. Schema registry v7 stamps every record.', tag: 'ingest.changed ▸ validated' },
              { n: '02', icon: Cog, t: 'Process', d: 'WASM transforms: enrichment, windowed aggregation, fraud scoring — exactly-once, 6 partitions, zero-copy.', tag: 'wasm.exec ▸ 4.2ms median' },
              { n: '03', icon: Database, t: 'Store', d: 'Postgres hot path + Redis cache + Parquet lake. Idempotent sinks make replays free.', tag: 'pg.sink ▸ checkpoint 214M' },
              { n: '04', icon: BarChart3, t: 'Analyze', d: 'Materialized views push over WebSockets to dashboards, alerts & your board deck.', tag: 'ws.fanout ▸ 38ms to pixels' },
            ].map((s, i) => (
              <div key={i} className="relative flex md:block gap-4 md:gap-0 items-start p-4 md:p-6">
                <div className="relative flex flex-col items-center md:items-start">
                  <div className="w-14 h-14 rounded-2xl grid place-items-center bg-gradient-to-br from-violet-deep/50 to-panel border border-violet-core/30 group-hover:border-gold/40">
                    <s.icon size={22} className="text-gold-soft" />
                  </div>
                  <span className="absolute -top-2 -right-3 md:right-auto md:left-10 font-mono text-[10px] text-gold/80">{s.n}</span>
                </div>
                <div className="md:mt-4">
                  <h3 className="font-display font-semibold text-white">{s.t}</h3>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-violet-mist/75">{s.d}</p>
                  <code className="mt-2 inline-block font-mono text-[9.5px] text-gold/80 bg-gold/5 border border-gold/15 rounded-md px-2 py-1">{s.tag}</code>
                </div>
                {i < 3 && <ArrowRight className="hidden md:block absolute top-9 -right-3 text-violet-soft/50" size={20} />}
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/pipeline" className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] text-gold hover:text-gold-soft transition-colors">
              <Radio size={13} /> INJECT A LIVE EVENT STREAM AND WATCH ALL 4 HOPS IN REAL TIME <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ LIVE ANALYTICS TEASER + ANOMALY ══════════ */}
      <section className="relative py-24 bg-[#08060f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 card-glow rounded-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-gold/85 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Live Preview · /console</div>
                <h3 className="font-display text-xl font-bold text-white mt-1.5">Throughput, as it happens</h3>
              </div>
              <Link to="/console" className="text-[11px] font-mono text-violet-soft hover:text-gold transition-colors flex items-center gap-1.5">OPEN FULL CONSOLE <ArrowRight size={12} /></Link>
            </div>
            <div className="mt-5">
              <AreaChart
                data={[snap.history.slice(-40).map(h => h.ingest), snap.history.slice(-40).map(h => h.processed)]}
                series={[{ name: 'Ingested', color: '#a78bfa' }, { name: 'Processed', color: '#ffd84d' }]}
                height={220}
                formatY={v => fmtCompact(v)} />
              <div className="flex items-center gap-5 mt-2 font-mono text-[10px] text-violet-mist/65">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-soft" />INGEST</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gold" />PROCESSED</span>
                <span className="ml-auto text-gold-soft/80">LIVE · 1s ROLLUP · WEBSOCKET FANOUT 38ms</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 card-glow rounded-2xl p-6 flex flex-col">
            <div className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-gold/85">Anomaly Radar</div>
            <h3 className="font-display text-xl font-bold text-white mt-1.5">Deviations, caught mid-flight</h3>
            <div className="mt-4 space-y-3 flex-1">
              {snap.anomalies.slice(0, 3).map(a => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line bg-panel/60 px-3.5 py-3">
                  <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.severity === 'critical' ? 'bg-rose-400 animate-pulse' : a.severity === 'warning' ? 'bg-gold' : 'bg-violet-soft'}`} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] leading-snug text-white/90 font-medium">{a.title}</p>
                    <p className="font-mono text-[9px] text-violet-mist/50 mt-1">{a.metric} · {a.status.toUpperCase()}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/anomalies" className="mt-4 inline-flex items-center justify-center gap-2 h-11 rounded-xl border border-gold/30 text-gold text-[12px] font-semibold hover:bg-gold/10 transition-colors">Open the Anomaly Center <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      {/* ══════════ WHY TEAMS SWITCH + PERCENTAGES ══════════ */}
      <section className="relative py-24 bg-[#0b0818] border-t border-line overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 30% 30%, #8b5cf6 0, transparent 50%), radial-gradient(circle at 75% 75%, #ffd84d 0, transparent 45%)' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-gold mb-4 flex items-center gap-3"><span className="h-px w-8 bg-gold-deep" />Why 900+ teams switch</div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-bold leading-[1.15] tracking-tight text-white">Batch jobs are <span className="font-serif italic text-violet-mist">archaeology.</span><br />DataStream is <span className="gradient-text">clairvoyance.</span></h2>
            <p className="mt-5 text-[14.5px] text-violet-mist/80 leading-relaxed max-w-md">Teams migrating off nightly ETL report the same punchlist — here it is, measured across 900+ production migrations in 2025–2026.</p>
            <blockquote className="mt-8 border-l-2 border-gold/50 pl-5">
              <p className="font-serif italic text-[16px] leading-snug text-violet-mist/90">“We deleted a 14-hour nightly reconciliation job. DataStream caught a $2.3M pricing-feed drift four minutes after it shipped — our CFO framed the alert.”</p>
              <footer className="mt-3 font-mono text-[10.5px] text-gold/80">— PRIYA RAMAN, VP DATA · BLUEBARN FINTECH · 41B EVENTS/MO</footer>
            </blockquote>
          </div>
          <div className="card-glow rounded-2xl p-7 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-violet-mist/70">Migration Outcomes · n=914</h3>
              <span className="flex items-center gap-1 text-[10px] font-mono text-gold"><Star size={11} fill="currentColor" /> 4.9 / 5 CSAT</span>
            </div>
            <HBar label="Faster time-to-insight" pct={96} value="38× median" color="linear-gradient(90deg,#f5b301,#ffe680)" />
            <HBar label="Infra cost reduction vs batch stack" pct={78} value="−78%" color="linear-gradient(90deg,#8b5cf6,#c4b5fd)" />
            <HBar label="Incident MTTR improvement" pct={84} value="−84%" color="linear-gradient(90deg,#f5b301,#ffe680)" />
            <HBar label="Bad-data events caught pre-sink" pct={99} value="99.1%" color="linear-gradient(90deg,#8b5cf6,#c4b5fd)" />
            <HBar label="Teams shipping in under 90 seconds" pct={92} value="92%" color="linear-gradient(90deg,#f5b301,#ffe680)" />
            <div className="pt-4 border-t border-line flex items-center justify-between">
              <Donut segments={[
                { label: 'Replaced Airflow+cron', value: 46, color: '#ffd84d' },
                { label: 'Replaced Kafka hand-rolled', value: 31, color: '#8b5cf6' },
                { label: 'Greenfield streaming', value: 23, color: '#4c3a8f' },
              ]} size={92} thickness={13} centerValue="914" centerLabel="MIGRATIONS" />
              <p className="text-[11px] leading-relaxed text-violet-mist/70 max-w-[190px]">Where DataStream displaced existing infrastructure in the last 18 months</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="relative py-24 bg-[#08060f]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <SectionHeading eyebrow="Questions" title={<>Answers at <span className="gradient-text">stream speed</span></>} />
          <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden bg-panel/40">
            {FAQS.map((f, i) => (
              <div key={i}>
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left hover:bg-white/[0.02] transition-colors" aria-expanded={faqOpen === i}>
                  <span className="font-display font-medium text-[15px] text-white/95">{f.q}</span>
                  <ChevronDown size={18} className={`shrink-0 text-gold transition-transform duration-300 ${faqOpen === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {faqOpen === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .3 }}>
                      <p className="px-6 pb-6 text-[13.5px] leading-relaxed text-violet-mist/80">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="relative py-28 overflow-hidden border-t border-line">
        <img src="/images/hero-stream.png" alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/70 via-obsidian/40 to-obsidian" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Waves className="mx-auto text-gold mb-6" size={40} strokeWidth={1.4} />
          <h2 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white leading-[1.08]">Your data is already<br /><span className="gradient-text">trying to tell you something.</span></h2>
          <p className="mt-5 text-violet-mist/85 text-[15px]">Free tier. No credit card. A live pipeline at the end of this sentence.</p>
          <button onClick={() => navigate('/console')}
            className="mt-9 group h-14 pl-8 pr-3 rounded-2xl inline-flex items-center gap-4 font-display font-bold text-[#241a05] bg-gradient-to-br from-gold-soft via-gold to-gold-deep shadow-[0_10px_50px_rgba(245,179,1,0.45)] hover:-translate-y-0.5 transition-all">
            Start streaming now
            <span className="w-9 h-9 grid place-items-center rounded-xl bg-[#241a05] text-gold group-hover:translate-x-1 transition-transform"><ArrowRight size={17} strokeWidth={2.5} /></span>
          </button>
          <p className="mt-6 font-mono text-[10px] tracking-[0.25em] text-violet-mist/50">1.4B EVENTS/DAY · 99.99% SLA · SOC 2 TYPE II</p>
        </div>
      </section>
    </div>
  );
}
