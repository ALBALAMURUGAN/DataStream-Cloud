import { useState } from 'react';
import {
  Layers3, Server, Workflow, Database, Zap, GitBranch, Table2, Braces, Rocket,
  CheckCircle2, Copy, ChevronRight, Lock, Globe, FileCode2, Terminal,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { engine, fmtCompact } from '../lib/engine';
import { HBar, RadialGauge } from '../components/charts';
import { useToast } from '../components/ui';

const STACK = [
  { icon: Braces, name: 'React 19 + TypeScript', role: 'Operator console & marketing surface', detail: 'Server-driven UI over WebSocket fanout · 60fps charts on canvas/SVG · strict types end-to-end', metric: '38ms p99 to pixels' },
  { icon: Server, name: 'Node.js · Express · ws', role: 'Edge gateway & fanout service', detail: 'JWT-auth’d WebSocket gateway · 40K concurrent connections per node · backpressure-aware broadcast', metric: '12K msg/s per fanout node' },
  { icon: Terminal, name: 'Python 3.12 · psycopg3', role: 'Database integration layer', detail: 'Typed ingestion workers, schema-registry evolution, quality scoring & backfill orchestration against Postgres 16', metric: '4.2ms median query TTFB' },
  { icon: GitBranch, name: 'Redpanda (Kafka API)', role: 'Streaming backbone', detail: 'ds.events.v7 · 6 partitions · RF=3 · tiered storage to S3 · p99 produce latency 3ms', metric: '214M offsets today' },
  { icon: Database, name: 'PostgreSQL 16 + Redis', role: 'Hot analytics path', detail: 'Continuous aggregate refresh via materialized views · Redis token-bucket rate limiting · logical replication to Parquet', metric: '99.995% availability' },
  { icon: Workflow, name: 'WASM Transform Executor', role: 'In-stream compute', detail: 'Same-binary transforms in dev and prod · sandboxed · deterministic · exactly-once via transactional offsets', metric: '4.2ms median execution' },
];

const CODE_TABS = [
  { id: 'ingest', label: 'ingest.py', lang: 'python', code: `# Python · database integration layer (psycopg3)
import psycopg
from datastream import SchemaRegistry, quality_score

async def ingest_batch(records: list[dict]) -> IngestResult:
    registry = SchemaRegistry("ds.events.v7", version="7")
    async with await psycopg.AsyncConnection.connect(DSN) as conn:
        async with conn.cursor() as cur:
            for rec in records:
                registry.validate(rec)          # raises → DLQ
                await cur.execute(
                    """INSERT INTO processed_events
                       (id, ts, type, region, amount, latency_ms, status)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)
                       ON CONFLICT (id) DO NOTHING""",  # idempotent sink
                    (rec["id"], rec["ts"], rec["type"], rec["region"],
                     rec["amount"], rec["latency_ms"], rec["status"]))
        await conn.commit()
    return IngestResult(rows=len(records), quarantined=registry.dlq_size)` },
  { id: 'fanout', label: 'fanout.js', lang: 'node', code: `// Node.js · WebSocket fanout with backpressure
const { WebSocketServer } = require('ws');
const wss = new WebSocketServer({ port: 8080, perMessageDeflate: false });

const channel = consumer.subscribe('ds.events.v7', {
  fromBeginning: false, isolationLevel: 'read_committed',
});
channel.on('batch', (events) => {
  const frame = encode({ type: 'events', v: 7, batch: events });
  for (const client of wss.clients) {
    if (client.bufferedAmount > 1_000_000) {   // slow-consumer shed
      client.terminate(); continue;
    }
    client.send(frame);
  }
});
wss.on('connection', (ws, req) => requireAuth('jwt', req));  // HS256 verify` },
  { id: 'query', label: 'query.sql', lang: 'sql', code: `-- Continuous aggregate · refreshed every 1s
CREATE MATERIALIZED VIEW revenue_per_minute AS
SELECT time_bucket('1 minute', ts) AS bucket,
       region,
       count(*)                          AS events,
       sum(amount) FILTER (WHERE status='ok')  AS gross_revenue,
       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms
FROM   processed_events
WHERE  ts > now() - interval '2 hours'
GROUP  BY 1, 2
WITH NO DATA;
SELECT add_continuous_aggregate_policy('revenue_per_minute',
  start_offset => interval '2 hours', end_offset => interval '1 second',
  schedule_interval => interval '1 second');` },
];

const CLI = `$ npm install -g @datastream/cli
$ datastream login --workspace ds-prod-01

$ datastream pipelines create events-gold \\
    --source csv://uploads/q4-orders.csv \\
    --transform ./transforms/score_fraud.wasm \\
    --window 1m --aggregation 'sum(amount) by region'
✓ pipeline ds-prod-01/events-gold provisioned in 74s

$ datastream query 'select region, gross_revenue from revenue_per_minute order by 2 desc'
  region      | gross_revenue
  ────────────┼───────────────
  us-east-1   |   $3,412,884.10
  eu-west-1   |   $2,105,334.77
  ap-south-1  |   $1,842,901.15
  sa-east-1   |   $1,051,430.08`;

export default function Architecture() {
  const snap = useEngine();
  const { push } = useToast();
  const [tab, setTab] = useState('ingest');
  const active = CODE_TABS.find(t => t.id === tab)!;

  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    push('success', 'Copied to clipboard', what);
  };

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-16 mesh-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold flex items-center gap-2"><Layers3 size={13} /> Under the Hood</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">Architecture, <span className="gradient-text">end to end</span></h1>
          <p className="text-[12.5px] text-violet-mist/70 mt-1.5 max-w-2xl">Mainstream stack, used at unreasonable scale: TypeScript at the edge, Redpanda in the middle, Postgres at the truth layer, Python where the data lives.</p>
        </div>

        {/* ── data path diagram ── */}
        <div className="glass rounded-2xl p-5 sm:p-7 mb-8 overflow-x-auto">
          <div className="flex items-center justify-between mb-5 min-w-[860px]">
            <h2 className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-violet-mist/65">The Record's Journey · ds-events-v7</h2>
            <span className="font-mono text-[9px] text-emerald-400/85">● LIVE · {fmtCompact(snap.actualEps || snap.eventsPerSec)} EVT/S · COMMIT OFFSET {fmtCompact(snap.partitions[0])}</span>
          </div>
          <div className="flex items-stretch gap-0 min-w-[860px]">
            {[
              { icon: Zap, label: 'SOURCES', sub: 'CSV · JSON · WS · Kafka', tint: '#ffd84d' },
              { icon: Globe, label: 'EDGE GATEWAY', sub: 'Node.js · auth · rate-limit', tint: '#a78bfa' },
              { icon: GitBranch, label: 'REDPANDA', sub: '6 partitions · RF=3 · compacted', tint: '#ffd84d' },
              { icon: Workflow, label: 'WASM EXECUTOR', sub: 'enrich · window · score', tint: '#a78bfa' },
              { icon: Database, label: 'POSTGRES 16', sub: 'hot path · MV rollups · CDC', tint: '#ffd84d' },
              { icon: Table2, label: 'ANALYTICS', sub: 'console · alerts · exports', tint: '#a78bfa' },
            ].map((n, i, arr) => (
              <div key={i} className="flex items-center flex-1">
                <div className="flex-1 rounded-2xl border border-line2 bg-panel p-3.5 text-center hover:border-gold/40 transition-colors duration-300 group">
                  <n.icon size={22} strokeWidth={1.6} className="mx-auto" style={{ color: n.tint }} />
                  <div className="font-display text-[11px] font-bold text-white mt-2 tracking-wide">{n.label}</div>
                  <div className="font-mono text-[8px] text-violet-mist/55 mt-1 leading-snug">{n.sub}</div>
                </div>
                {i < arr.length - 1 && (
                  <div className="flex flex-col items-center px-1">
                    <div className="w-5 h-[2px] bg-gradient-to-r from-gold to-violet-core relative overflow-hidden rounded">
                      <div className="absolute inset-y-[-1px] w-1.5 rounded bg-white/90 animate-scan" />
                    </div>
                    <ChevronRight size={12} className="text-gold/70 -mt-[7px]" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 min-w-[860px]">
            {[['14ms', 'edge auth + validate'], ['3ms', 'broker produce p99'], ['4.2ms', 'transform exec p50'], ['38ms', 'sink → pixel fanout']].map(([v, l]) => (
              <div key={l} className="text-center"><div className="font-display text-xl font-bold gold-text">{v}</div><div className="font-mono text-[8px] text-violet-mist/55 uppercase tracking-wider mt-0.5">{l}</div></div>
            ))}
          </div>
        </div>

        {/* ── stack grid ── */}
        <h2 className="font-display text-xl font-bold text-white mb-4">The Stack</h2>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
          {STACK.map((s, i) => (
            <div key={i} className="card-glow rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <span className="w-11 h-11 rounded-xl grid place-items-center border border-gold/25 bg-gold/5"><s.icon size={20} className="text-gold" /></span>
                <div><h3 className="font-display text-[14px] font-bold text-white leading-tight">{s.name}</h3><p className="font-mono text-[8.5px] text-violet-soft/85 uppercase tracking-wider mt-0.5">{s.role}</p></div>
              </div>
              <p className="text-[11.5px] leading-relaxed text-violet-mist/75 mt-3">{s.detail}</p>
              <div className="mt-3 pt-3 border-t border-line font-mono text-[9px] text-gold-soft/85">{s.metric}</div>
            </div>
          ))}
        </div>

        {/* ── code tabs + CLI ── */}
        <div className="grid lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-line2 bg-[#0b0918] shadow-2xl shadow-violet-deep/10">
            <div className="flex items-center gap-2 px-4 h-12 border-b border-line bg-[#100d21]">
              <span className="flex gap-1.5"><i className="w-3 h-3 rounded-full bg-rose-500/80 block" /><i className="w-3 h-3 rounded-full bg-gold/80 block" /><i className="w-3 h-3 rounded-full bg-emerald-500/80 block" /></span>
              <div className="flex gap-1 ml-3">
                {CODE_TABS.map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`h-8 px-3 rounded-t-lg font-mono text-[10px] transition-all border-b-2 ${tab === t.id ? 'text-gold border-gold bg-gold/5' : 'text-violet-mist/55 border-transparent hover:text-white'}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <button onClick={() => copy(active.code, active.label)} aria-label="Copy code" className="ml-auto text-violet-mist/60 hover:text-gold transition-colors"><Copy size={14} /></button>
            </div>
            <pre className="p-5 overflow-auto text-[10px] leading-[1.7] font-mono max-h-[420px]"><code className="text-violet-mist/90">{active.code}</code></pre>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="rounded-2xl overflow-hidden border border-gold/25 bg-[#0d0b16]">
              <div className="flex items-center justify-between px-4 h-11 border-b border-gold/15 bg-gold/5">
                <span className="font-mono text-[9.5px] tracking-[0.2em] text-gold flex items-center gap-2"><Terminal size={12} /> 90-SECOND QUICKSTART</span>
                <button onClick={() => copy(CLI, 'quickstart.sh')} aria-label="Copy CLI quickstart" className="text-gold/70 hover:text-gold"><Copy size={13} /></button>
              </div>
              <pre className="p-4 overflow-auto text-[9px] leading-[1.65] font-mono text-emerald-300/85 max-h-[240px]">{CLI}</pre>
            </div>
            <div className="glass rounded-2xl p-5 flex-1">
              <h3 className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-violet-mist/65 flex items-center gap-2"><Lock size={12} className="text-gold" /> Production posture</h3>
              <div className="mt-3 space-y-2">
                {['Exactly-once via transactional offset commits', 'SOC 2 Type II · ISO 27001 · GDPR DPA', 'mTLS everywhere · KMS-envelope encryption at rest', 'PITR backups · 35-day WAL retention', 'Zero-trust: every hop authenticated & authorized'].map(t => (
                  <div key={t} className="flex items-start gap-2 text-[11px] text-violet-mist/85"><CheckCircle2 size={13} className="text-emerald-400 mt-0.5 shrink-0" />{t}</div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-line grid grid-cols-3 gap-2 text-center">
                {[['99.99', 'SLA %'], ['0.0', 'RPO events'], ['800', 'RTO ms']].map(([v, l]) => (
                  <div key={l}><div className="font-display text-lg font-bold text-gold-soft">{v}</div><div className="font-mono text-[8px] text-violet-mist/55">{l}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── capacity planning bars ── */}
        <div className="glass rounded-2xl p-6 mt-5 grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-4">
            <h2 className="font-display font-bold text-white text-lg">Capacity, headroom & <span className="gold-text">cost</span></h2>
            <p className="text-[11.5px] text-violet-mist/70 mt-1.5">Live shape of the production footprint. Numbers move — go look at the console.</p>
            <RadialGauge value={snap.cpu} max={100} label={`${snap.cpu}%`} sublabel="CLUSTER CPU" size={120} color="#ffd84d" />
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-x-10 gap-y-4">
            <HBar label="Headroom before autoscale" pct={62} value="62% free" color="linear-gradient(90deg,#f5b301,#ffe680)" />
            <HBar label="Partition balance (skew)" pct={94} value="±3.1%" color="linear-gradient(90deg,#8b5cf6,#c4b5fd)" />
            <HBar label="Storage tiered to object store" pct={81} value="81%" color="linear-gradient(90deg,#f5b301,#ffe680)" />
            <HBar label="Cache hit rate (Redis)" pct={97} value="97.3%" color="linear-gradient(90deg,#8b5cf6,#c4b5fd)" />
          </div>
        </div>
      </div>
    </div>
  );
}
