// ─────────────────────────────────────────────────────────────────────────────
// DataStream Cloud · Client-side streaming simulation engine
// Models: WebSocket ingress → Redpanda topic → WASM transform → Postgres sink
// Runs on a shared 100ms clock so every chart/metric stays in lock-step.
// ─────────────────────────────────────────────────────────────────────────────

export type EventType = 'purchase' | 'page_view' | 'signup' | 'refund' | 'api_call';
export type Region = 'us-east-1' | 'eu-west-1' | 'ap-south-1' | 'sa-east-1';
export type AnomalySeverity = 'critical' | 'warning' | 'info';
export type AnomalyStatus = 'active' | 'acknowledged' | 'resolved';

export interface StreamEvent {
  id: string;
  ts: number;
  type: EventType;
  region: Region;
  amount: number;
  latencyMs: number;
  status: 'ok' | 'failed';
}

export interface Anomaly {
  id: string;
  ts: number;
  severity: AnomalySeverity;
  title: string;
  detail: string;
  metric: string;
  status: AnomalyStatus;
}

export interface ThroughputPoint {
  t: number; // epoch ms
  label: string;
  ingest: number;
  processed: number;
  failed: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface DatasetRow {
  id: string;
  ts: number;
  type: string;
  region: string;
  amount: number;
  latencyMs: number;
  status: 'ok' | 'failed';
  source: 'stream' | 'csv' | 'json';
}

export interface EngineSnapshot {
  running: boolean;
  failureBurstActive: boolean;
  eventsPerSec: number; // target rate from slider
  actualEps: number;    // measured last second
  totalProcessed: number;
  totalFailed: number;
  errorRate: number;    // 0-100
  p50: number; p95: number; p99: number;
  alive: [boolean, boolean, boolean, boolean]; // ingest, redpanda, wasm, postgres
  kafkaLag: number;
  cpu: number; vcpu: number; mem: number;
  partitions: number[]; // per-partition offsets (6)
  finiteState: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
  circuitOpen: boolean;
  silencedUntil: number | null;
  history: ThroughputPoint[];
  events: StreamEvent[];
  anomalies: Anomaly[];
  rows: DatasetRow[];
  typeDistribution: Record<EventType, number>;
  revenueTotal: number;
  successRate: number;
}

const REGIONS: Region[] = ['us-east-1', 'eu-west-1', 'ap-south-1', 'sa-east-1'];
const TYPE_WEIGHTS: [EventType, number][] = [
  ['page_view', 0.42], ['api_call', 0.28], ['purchase', 0.16], ['signup', 0.09], ['refund', 0.05],
];
const AMOUNT_RANGE: Record<EventType, [number, number]> = {
  purchase: [12, 2400], refund: [20, 900], signup: [0, 0], page_view: [0, 0], api_call: [0, 3],
};

function pickType(): EventType {
  let r = Math.random();
  for (const [t, w] of TYPE_WEIGHTS) { if ((r -= w) <= 0) return t; }
  return 'page_view';
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const labelOf = (ts: number) => new Date(ts).toLocaleTimeString('en-GB', { hour12: false });
let uid = 4120000;

export function generateEvent(): StreamEvent {
  const type = pickType();
  const [a, b] = AMOUNT_RANGE[type];
  return {
    id: `evt-${(uid++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    ts: Date.now(),
    type,
    region: pick(REGIONS),
    amount: Math.round(rnd(a, b) * 100) / 100,
    latencyMs: Math.round(Math.max(4, rnd(28, 120) + (Math.random() < 0.04 ? rnd(200, 700) : 0))),
    status: Math.random() < 0.015 ? 'failed' : 'ok',
  };
}

class Engine {
  running = false;
  eventsPerSec = 2400;

  private tickMs = 100;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private version = 0;

  // rolling metrics
  private processedThisSecond = 0;
  private failedThisSecond = 0;
  private actualEps = 0;
  private epsWindow: number[] = []; // events generated per 100ms tick
  private totalProcessed = 1_284_392;
  private totalFailed = 4_117;
  private revenueTotal = 8_412_550;
  private typeDistribution: Record<EventType, number> = {
    page_view: 539_444, api_call: 359_630, purchase: 205_503, signup: 115_595, refund: 64_220,
  };

  // latency tracking (reservoir of recent latencies)
  private latencySamples: number[] = [];
  private p50 = 34; private p95 = 78; private p99 = 128;

  // pipeline stages
  private alive: [boolean, boolean, boolean, boolean] = [true, true, true, true];
  private kafkaLag = 12;
  private cpu = 34; private vcpu = 2.4; private mem = 58;
  private partitions = [214_481_920, 214_483_113, 214_475_220, 214_490_771, 214_482_345, 214_487_009];
  private finiteState: 'OPEN' | 'CLOSED' | 'HALF_OPEN' = 'CLOSED';
  private circuitOpen = false;
  private silencedUntil: number | null = null;
  private failureBurst = 0; // ticks remaining of induced failure
  private spikeBurst = 0;

  history: ThroughputPoint[] = [];
  events: StreamEvent[] = [];
  anomalies: Anomaly[] = [];
  rows: DatasetRow[] = [];

  private anomalyCooldown: Record<string, number> = {};
  private tickCount = 0;
  private lastSecondMark = Date.now();

  constructor() {
    this.seed();
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  };
  getVersion = () => this.version;
  private emit() { this.version++; this.listeners.forEach(l => l()); }

  start() {
    if (this.timer) return;
    this.running = true;
    this.timer = setInterval(() => this.tick(), this.tickMs);
    this.emit();
  }
  pause() {
    this.running = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.emit();
  }
  setRate(v: number) { this.eventsPerSec = v; this.emit(); }

  destroyStage(stage: 0 | 1 | 2 | 3) {
    this.alive[stage] = false;
    if (stage <= 1) this.kafkaLag = Math.min(this.kafkaLag + 250, 950);
    this.raiseAnomaly('critical', `Stage failure: ${['Ingestion Gateway', 'Redpanda Broker', 'WASM Transform', 'Postgres Sink'][stage]} went offline`,
      'Auto-remediation triggered · circuit breaker evaluating · failover replica promoted within 800ms', 'pipeline.availability');
    this.emit();
  }
  healStage(stage: 0 | 1 | 2 | 3) {
    this.alive[stage] = true;
    this.kafkaLag = Math.max(0, this.kafkaLag - 220);
    this.raiseAnomaly('info', `Stage recovered: ${['Ingestion Gateway', 'Redpanda Broker', 'WASM Transform', 'Postgres Sink'][stage]} is healthy`,
      'Health probe passing · offsets resuming from last committed position', 'pipeline.availability');
    this.emit();
  }
  injectFailure() { this.failureBurst = 30; this.raiseAnomaly('warning', 'Chaos event injected: downstream timeout storm', 'Simulated 30s burst of transform timeouts · watch circuit breaker react', 'chaos.injection'); this.emit(); }
  injectSpike() { this.spikeBurst = 40; this.raiseAnomaly('warning', 'Traffic spike injected: 3.2× baseline load', 'Autoscaler provisioning +4 consumer instances', 'chaos.injection'); this.emit(); }
  silenceAnomalies(seconds: number) { this.silencedUntil = Date.now() + seconds * 1000; this.emit(); }
  acknowledgeAnomaly(id: string) { const a = this.anomalies.find(x => x.id === id); if (a) a.status = 'acknowledged'; this.emit(); }
  resolveAnomaly(id: string) { const a = this.anomalies.find(x => x.id === id); if (a) a.status = 'resolved'; this.emit(); }
  clearResolved() { this.anomalies = this.anomalies.filter(a => a.status !== 'resolved'); this.emit(); }

  acknowledgeAll() { this.anomalies.forEach(a => { if (a.status === 'active') a.status = 'acknowledged'; }); this.emit(); }

  // ── ingestion of user files ───────────────────────────────────────────────
  ingestRecords(records: Partial<DatasetRow>[], source: 'csv' | 'json'): number {
    const now = Date.now();
    const mapped: DatasetRow[] = records.slice(0, 500).map((r, i) => ({
      id: r.id || `${source}-${now.toString(36)}-${i}`,
      ts: r.ts && !Number.isNaN(Number(r.ts)) ? Number(r.ts) : now - i * 1000,
      type: String(r.type || pick(['purchase', 'page_view', 'api_call', 'signup'])).toLowerCase().replace(/\s/g, '_'),
      region: String(r.region || pick(REGIONS)),
      amount: Number(r.amount) || 0,
      latencyMs: Number(r.latencyMs) || Math.round(rnd(20, 160)),
      status: (String(r.status || 'ok').toLowerCase() === 'failed' ? 'failed' : 'ok') as 'ok' | 'failed',
      source,
    }));
    this.rows = [...mapped, ...this.rows].slice(0, 400);
    this.totalProcessed += mapped.length;
    mapped.forEach(r => { this.typeDistribution[(r.type as EventType)] = (this.typeDistribution[r.type as EventType] || 0) + 1; });
    this.raiseAnomaly('info', `Batch ingested: ${mapped.length} records via ${source.toUpperCase()} connector`,
      `Schema validated against registry v${(Math.random() * 3 + 4).toFixed(1)} · ${mapped.filter(r => r.status === 'failed').length} rows quarantined to DLQ`, 'ingest.batch');
    this.emit();
    return mapped.length;
  }

  // ── seeding so the UI is alive on first paint ─────────────────────────────
  private seed() {
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      const t = now - i * 1000;
      const wave = Math.sin((59 - i) / 9.5) * 320 + Math.sin((59 - i) / 3.7) * 120;
      const ingest = Math.round(2400 + wave + rnd(-140, 140));
      const failed = Math.round(ingest * rnd(0.004, 0.016));
      const processed = ingest - failed;
      const p50 = Math.round(rnd(28, 42));
      const p95 = Math.round(p50 * rnd(1.9, 2.4));
      this.history.push({
        t, label: labelOf(t), ingest, processed, failed,
        p50, p95, p99: Math.round(p95 * rnd(1.5, 1.9)),
      });
    }
    for (let i = 0; i < 130; i++) this.events.push(generateEvent());
    this.events.sort((a, b) => b.ts - a.ts);
    for (let i = 0; i < 60; i++) {
      const e = generateEvent();
      this.rows.push({ ...e, source: 'stream' });
    }
    const seedAnomalies: [AnomalySeverity, string, string, string, number][] = [
      ['warning', 'Latency p95 drift on eu-west-1', 'p95 rose 31% over 10m window · consumer group ds-transform-prod rebalanced 2 partitions', 'latency.p95', 6],
      ['info', 'Schema registry auto-evolved purchase.v7', 'Field loyalty_tier added as optional · 0 breaking changes detected', 'schema.registry', 18],
      ['critical', 'Dead-letter queue threshold breached', 'DLQ depth 214 > 200 · 38 malformed refund events quarantined from /events/refunds', 'dlq.depth', 27],
      ['info', 'Autoscaler added 2 consumer replicas', 'Lag on partition 3 reached 400 · scaled ds-transform-prod 6→8', 'autoscale.lag', 41],
    ];
    seedAnomalies.forEach(([severity, title, detail, metric, minsAgo], i) => {
      this.anomalies.push({
        id: `seed-${i}`, ts: now - minsAgo * 60_000, severity, title, detail, metric,
        status: i === 0 ? 'active' : i === 2 ? 'active' : 'acknowledged',
      });
    });
  }

  // ── core tick ─────────────────────────────────────────────────────────────
  private tick() {
    this.tickCount++;
    const now = Date.now();

    // stage health drives throughput multiplier
    const ingestAlive = this.alive[0], brokerAlive = this.alive[1], wasmAlive = this.alive[2], pgAlive = this.alive[3];
    let stageFactor = 1;
    if (!ingestAlive) stageFactor = 0;
    else if (!brokerAlive) stageFactor = 0.12;
    else if (!wasmAlive) stageFactor = 0.3;
    else if (!pgAlive) stageFactor = 0.55;

    let target = this.eventsPerSec * stageFactor;
    if (this.spikeBurst > 0) { target *= 3.2; this.spikeBurst--; }
    let failure = this.failureBurst > 0;
    if (this.failureBurst > 0) this.failureBurst--;

    const wave = Math.sin(now / 4200) * 0.09 + Math.sin(now / 1530) * 0.05;
    target = target * (1 + wave) * rnd(0.88, 1.12);
    const perTick = Math.max(0, Math.round(target / 10 + rnd(-8, 8)));

    // generate events
    const newEvents: StreamEvent[] = [];
    for (let i = 0; i < perTick; i++) {
      const e = generateEvent();
      if (failure) { e.status = Math.random() < 0.42 ? 'failed' : 'ok'; e.latencyMs += Math.round(rnd(180, 520)); }
      newEvents.push(e);
    }

    this.totalProcessed += perTick;
    const failedNow = newEvents.filter(e => e.status === 'failed').length;
    this.totalFailed += failedNow;
    this.processedThisSecond += perTick;
    this.failedThisSecond += failedNow;

    newEvents.forEach(e => {
      this.typeDistribution[e.type]++;
      if (e.type === 'purchase' && e.status === 'ok') this.revenueTotal += e.amount;
      this.latencySamples.push(e.latencyMs);
    });
    if (this.latencySamples.length > 400) this.latencySamples.splice(0, this.latencySamples.length - 400);

    // push into UI streams
    this.events = [...newEvents.slice(-4).reverse(), ...this.events].slice(0, 80);
    const rowsToAdd = newEvents.slice(-2).reverse().map(e => ({ ...e, source: 'stream' as const }));
    this.rows = [...rowsToAdd, ...this.rows].slice(0, 400);

    // per-partition offsets advance
    this.partitions = this.partitions.map(p => p + Math.round(perTick / 6 + rnd(0, 3)));

    // latency percentiles
    if (this.latencySamples.length > 20) {
      const s = [...this.latencySamples].sort((a, b) => a - b);
      const q = (p: number) => s[Math.floor((s.length - 1) * p)];
      this.p50 = Math.round(this.p50 * 0.7 + q(0.5) * 0.3);
      this.p95 = Math.round(this.p95 * 0.7 + q(0.95) * 0.3);
      this.p99 = Math.round(this.p99 * 0.7 + q(0.99) * 0.3);
    }

    // broker lag & resources
    if (brokerAlive) this.kafkaLag = Math.max(0, this.kafkaLag + Math.round((perTick / 10 - this.eventsPerSec / 10) * 0.4 + rnd(-4, 5)));
    else this.kafkaLag = Math.min(980, this.kafkaLag + Math.round(rnd(8, 18)));
    this.cpu = Math.min(96, Math.max(9, this.cpu * 0.85 + (30 + (perTick / Math.max(this.eventsPerSec, 1)) * 45 + (failure ? 22 : 0)) * 0.15 + rnd(-3, 3)));
    this.mem = Math.min(92, Math.max(30, this.mem * 0.9 + (52 + this.kafkaLag / 60) * 0.1 + rnd(-2, 2)));
    this.vcpu = Math.round((this.cpu / 40) * 10) / 10 + 1.2;

    // circuit breaker logic
    const errRate = perTick > 0 ? (failedNow / perTick) * 100 : 0;
    if (failure && errRate > 25 && !this.circuitOpen) {
      this.circuitOpen = true; this.finiteState = 'OPEN';
      this.raiseAnomaly('critical', 'Circuit breaker OPEN — transform executor shed load',
        `Error rate ${errRate.toFixed(1)}% exceeded 20% threshold · rejecting new work for 5s cooldown`, 'circuit.breaker');
    } else if (!failure && this.circuitOpen && this.tickCount % 40 === 0) {
      this.finiteState = 'HALF_OPEN';
    } else if (this.finiteState === 'HALF_OPEN' && !failure) {
      this.circuitOpen = false; this.finiteState = 'CLOSED';
      this.raiseAnomaly('info', 'Circuit breaker CLOSED — pipeline restored', 'Half-open probe succeeded · traffic flowing normally', 'circuit.breaker');
    }

    // once per second: roll up history + measured eps
    if (now - this.lastSecondMark >= 1000) {
      this.actualEps = this.processedThisSecond;
      const failed = this.failedThisSecond;
      const processed = this.processedThisSecond - failed;
      this.history = [...this.history, {
        t: now, label: labelOf(now), ingest: this.processedThisSecond, processed, failed,
        p50: this.p50, p95: this.p95, p99: this.p99,
      }].slice(-60);
      this.processedThisSecond = 0; this.failedThisSecond = 0; this.lastSecondMark = now;
    }

    // anomaly detection on a light cadence
    if (this.tickCount % 25 === 0) this.detectAnomalies();

    this.emit();
  }

  private detectAnomalies() {
    const now = Date.now();
    const silenced = this.silencedUntil && now < this.silencedUntil;
    const canRaise = (key: string, cooldownMs: number) => {
      if (silenced) return false;
      if ((this.anomalyCooldown[key] || 0) > now - cooldownMs) return false;
      this.anomalyCooldown[key] = now;
      return true;
    };
    const errRate = this.totalProcessed > 0 ? (this.totalFailed / this.totalProcessed) * 100 : 0;

    if (this.kafkaLag > 350 && canRaise('lag', 45_000)) {
      this.raiseAnomaly('warning', `Consumer lag at ${Math.round(this.kafkaLag)} offsets`,
        'Group ds-transform-prod falling behind on partition 3 · autoscaler notified', 'kafka.lag');
    }
    if (this.p95 > 150 && canRaise('p95', 45_000)) {
      this.raiseAnomaly('warning', `p95 latency at ${this.p95}ms (SLO 120ms)`,
        'Transform executor pool saturated · consider scaling vCPU or enabling WASM SIMD', 'latency.p95');
    }
    if (errRate > 1.1 && canRaise('err', 60_000)) {
      this.raiseAnomaly('warning', `Error budget burn: ${errRate.toFixed(2)}% of events failing`,
        'Failure classifier: 62% schema mismatch · 24% upstream timeout · 14% poison pill', 'error.budget');
    }
    if (this.cpu > 82 && canRaise('cpu', 60_000)) {
      this.raiseAnomaly('warning', `Executor CPU at ${Math.round(this.cpu)}%`,
        'Sustained >80% for 60s · HPA scaling out', 'resource.cpu');
    }
  }

  private raiseAnomaly(severity: AnomalySeverity, title: string, detail: string, metric: string) {
    this.anomalies = [{
      id: `an-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      ts: Date.now(), severity, title, detail, metric, status: 'active' as AnomalyStatus,
    }, ...this.anomalies].slice(0, 60);
  }

  // ── snapshot for React (via useSyncExternalStore) ─────────────────────────
  private snap: EngineSnapshot | null = null;
  private snapVersion = -1;

  getSnapshot = (): EngineSnapshot => {
    if (this.snap && this.snapVersion === this.version) return this.snap;
    const s = [...this.latencySamples].sort((a, b) => a - b);
    const q = (p: number) => (s.length ? s[Math.floor((s.length - 1) * p)] : 0);
    const typeDistribution = { ...this.typeDistribution };
    const totalType = Object.values(typeDistribution).reduce((a, b) => a + b, 0) || 1;
    this.snap = {
      running: this.running,
      failureBurstActive: this.failureBurst > 0,
      eventsPerSec: this.eventsPerSec,
      actualEps: this.actualEps,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      errorRate: this.totalProcessed > 0 ? (this.totalFailed / this.totalProcessed) * 100 : 0,
      p50: this.p50, p95: this.p95, p99: this.p99,
      alive: [...this.alive] as EngineSnapshot['alive'],
      kafkaLag: Math.round(this.kafkaLag),
      cpu: Math.round(this.cpu), vcpu: this.vcpu, mem: Math.round(this.mem),
      partitions: [...this.partitions],
      finiteState: this.finiteState,
      circuitOpen: this.circuitOpen,
      silencedUntil: this.silencedUntil,
      history: this.history,
      events: this.events,
      anomalies: this.anomalies,
      rows: this.rows,
      typeDistribution,
      revenueTotal: Math.round(this.revenueTotal),
      successRate: this.totalProcessed > 0 ? ((this.totalProcessed - this.totalFailed) / this.totalProcessed) * 100 : 100,
    };
    this.snapVersion = this.version;
    return this.snap;
  };
}

export const engine = new Engine();

// ── helpers shared across the dashboard ──────────────────────────────────────
export const fmtCompact = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : `${Math.round(n)}`;
export const fmtMoney = (n: number) =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${n.toFixed(2)}`;
export const timeAgo = (ts: number) => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};
