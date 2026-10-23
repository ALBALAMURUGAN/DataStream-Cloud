import { useId } from 'react';

// ── smooth path builder (Catmull-Rom → cubic Bézier) ─────────────────────────
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

// ── AreaChart: gradient-filled multi-series line chart ───────────────────────
export function AreaChart({
  data, series, height = 210, yLabel = '', formatY = (v: number) => `${v}`,
}: {
  data: number[][];
  series: { name: string; color: string; fill?: boolean }[];
  height?: number;
  yLabel?: string;
  formatY?: (v: number) => string;
}) {
  const id = useId().replace(/:/g, '');
  const W = 640, H = height, padL = 44, padB = 22, padT = 12, padR = 8;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = data[0]?.length ?? 0;
  if (n < 2) return <div style={{ height }} className="grid place-items-center text-xs text-violet-mist/50">awaiting telemetry…</div>;
  const max = Math.max(...data.flat()) * 1.15 || 1;
  const min = 0;
  const x = (i: number) => padL + (i / (n - 1)) * iw;
  const y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  const gridVals = [0, 0.33, 0.66, 1].map(f => max * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      <defs>
        {series.map((s, i) => (
          <linearGradient key={i} id={`g-${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity="0.42" />
            <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {gridVals.map((v, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="rgba(168,140,255,0.12)" strokeDasharray="3 5" />
          <text x={padL - 7} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="rgba(196,181,253,0.65)" fontFamily="JetBrains Mono">{formatY(v)}</text>
        </g>
      ))}
      {series.map((s, i) => {
        const pts = data[i].map((v, j) => ({ x: x(j), y: y(v) }));
        const line = smoothPath(pts);
        const area = `${line} L ${x(n - 1).toFixed(2)} ${y(0)} L ${x(0).toFixed(2)} ${y(0)} Z`;
        return (
          <g key={i}>
            {s.fill !== false && <path d={area} fill={`url(#g-${id}-${i})`} />}
            <path d={line} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${s.color}66)` }} />
          </g>
        );
      })}
      {[0, Math.floor(n / 2), n - 1].map(i => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9.5" fill="rgba(196,181,253,0.5)" fontFamily="JetBrains Mono">
          {i === n - 1 ? 'now' : `-${Math.round((n - 1 - i))}s`}
        </text>
      ))}
    </svg>
  );
}

// ── RadialGauge: SLA-style arc gauge with threshold ticks ────────────────────
export function RadialGauge({
  value, max, label, sublabel, size = 132, color = '#ffd84d', thresholds,
}: {
  value: number; max: number; label: string; sublabel?: string; size?: number; color?: string;
  thresholds?: { at: number; color: string }[];
}) {
  const id = useId().replace(/:/g, '');
  const pct = Math.min(1, Math.max(0, value / max));
  const R = 52, C = 2 * Math.PI * R;
  const ARC = 0.75; // 270°
  const offset = C * (1 - ARC * pct);
  const trackOffset = C * (1 - ARC);
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 140 140">
        <defs>
          <linearGradient id={`gd-${id}`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={color} /><stop offset="1" stopColor="#fff3bf" />
          </linearGradient>
          <filter id={`gl-${id}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <g transform="rotate(135 70 70)">
          <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(168,140,255,0.13)" strokeWidth="13"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={trackOffset} />
          <circle cx="70" cy="70" r={R} fill="none" stroke={`url(#gd-${id})`} strokeWidth="13" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset} transform="rotate(0 70 70)"
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 8px ${color}88)` }} />
          {thresholds?.map((t, i) => {
            // arc starts at φ=135° (after rotate(135)) and sweeps ARC × 360°
            const phi = ((135 + (t.at / max) * ARC * 360) * Math.PI) / 180;
            const r1 = R - 12, r2 = R + 12;
            const cx = 70, cy = 70;
            return <line key={i}
              x1={cx + r1 * Math.cos(phi)} y1={cy + r1 * Math.sin(phi)}
              x2={cx + r2 * Math.cos(phi)} y2={cy + r2 * Math.sin(phi)}
              stroke={t.color} strokeWidth="2.6" opacity="0.95" strokeLinecap="round" />;
          })}
        </g>
        <text x="70" y="68" textAnchor="middle" fontSize="23" fontWeight="700" fill="#fdf6d8" fontFamily="Space Grotesk">{label}</text>
        {sublabel && <text x="70" y="88" textAnchor="middle" fontSize="9" fill="rgba(196,181,253,0.75)" fontFamily="JetBrains Mono">{sublabel}</text>}
      </svg>
    </div>
  );
}

// ── Donut: distribution ring ─────────────────────────────────────────────────
export function Donut({
  segments, size = 150, thickness = 17, centerLabel, centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; centerLabel?: string; centerValue?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const R = (size - thickness) / 2, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="rgba(168,140,255,0.1)" strokeWidth={thickness} />
      {segments.map((s, i) => {
        const frac = s.value / total;
        const dash = frac * C;
        const off = -acc * C;
        acc += frac;
        return (
          <circle key={i} cx={size/2} cy={size/2} r={R} fill="none" stroke={s.color} strokeWidth={thickness}
            strokeDasharray={`${Math.max(0, dash - 2)} ${C - Math.max(0, dash - 2)}`} strokeDashoffset={off}
            transform={`rotate(-90 ${size/2} ${size/2})`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 5px ${s.color}55)` }} />
        );
      })}
      {centerValue && <text x="50%" y="47%" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fdf6d8" fontFamily="Space Grotesk">{centerValue}</text>}
      {centerLabel && <text x="50%" y="62%" textAnchor="middle" fontSize="8.5" fill="rgba(196,181,253,0.7)" fontFamily="JetBrains Mono">{centerLabel}</text>}
    </svg>
  );
}

// ── Horizontal bar row with animated width ───────────────────────────────────
export function HBar({ label, pct, value, color = 'linear-gradient(90deg,#f5b301,#ffd84d)', track = 'rgba(168,140,255,0.1)' }: {
  label: string; pct: number; value: string; color?: string; track?: string;
}) {
  return (
    <div className="group">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-medium text-violet-mist/85 group-hover:text-gold-soft transition-colors">{label}</span>
        <span className="text-[11px] font-mono text-gold-soft/90">{value}</span>
      </div>
      <div className="h-[7px] rounded-full overflow-hidden" style={{ background: track }}>
        <div className="h-full rounded-full relative transition-all duration-700" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }}>
          <div className="absolute inset-0 shimmer rounded-full opacity-60" />
        </div>
      </div>
    </div>
  );
}

// ── Sparkline (tiny, no axes) ────────────────────────────────────────────────
export function Sparkline({ data, color = '#ffd84d', width = 96, height = 30 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <svg width={width} height={height} />;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * (width - 2) + 1,
    y: height - 2 - ((v - min) / range) * (height - 6),
  }));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}88)` }} />
    </svg>
  );
}
