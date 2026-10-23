import { useEffect, useRef } from 'react';
import { engine } from '../lib/engine';

// Flowing particle river rendered on canvas. Particle velocity in each zone is
// modulated by the health of that pipeline stage, so killing a stage in the
// simulator visibly throttles the flow.
export default function FlowCanvas({ height = 240, density = 1 }: { height?: number; density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      w = rect.width; h = height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = '100%'; canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement!);

    // zone fractions of width: [ingest gate, redpanda, wasm, postgres] boundaries
    const ZONES = [0.16, 0.40, 0.66, 0.90];

    interface P { x: number; lane: number; speed: number; size: number; red: boolean; wobble: number; wob: number }
    const particles: P[] = [];
    let spawnAcc = 0;
    let last = performance.now();
    // stage flash energy [ingest, redpanda, wasm, postgres]
    const flash = [0, 0, 0, 0];

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const snap = engine.getSnapshot();
      const hFrac = [snap.alive[0] ? 1 : 0.04, snap.alive[1] ? 1 : 0.12, snap.alive[2] ? 1 : 0.3, snap.alive[3] ? 1 : 0.55];

      // ── spawn ──────────────────────────────────────────────────────────────
      if (snap.running) {
        spawnAcc += (snap.eventsPerSec / 60) * density * dt * 3.4;
        while (spawnAcc >= 1 && particles.length < 900) {
          spawnAcc -= 1;
          particles.push({
            x: -6, lane: (Math.random() - 0.5) * 0.72, speed: 0.16 + Math.random() * 0.1,
            size: 0.8 + Math.random() * 2.1, red: Math.random() < (snap.failureBurstActive ? 0.3 : 0.035),
            wobble: Math.random() * Math.PI * 2, wob: 0.8 + Math.random() * 1.6,
          });
        }
      } else if (Math.random() < 0.12 && particles.length < 900) {
        particles.push({ x: -6, lane: (Math.random() - 0.5) * 0.72, speed: 0.12, size: 1 + Math.random() * 1.6, red: false, wobble: Math.random() * Math.PI * 2, wob: 1 });
      }

      ctx.clearRect(0, 0, w, h);
      const midY = h * 0.5;
      const laneH = h * 0.30;

      // ── flow lanes (sine energy ribbons) ───────────────────────────────────
      ctx.lineWidth = 1;
      for (let l = -1; l <= 1; l++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 14) {
          const t = x * 0.013 + now * 0.0011 + l * 1.7;
          const y = midY + Math.sin(t) * laneH * 0.42 + l * laneH * 0.5;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = l === 0 ? 'rgba(255,216,77,0.13)' : 'rgba(139,92,246,0.16)';
        ctx.stroke();
      }

      // ── stage portals ──────────────────────────────────────────────────────
      for (let s = 0; s < 4; s++) {
        flash[s] = Math.max(0, flash[s] - dt * 1.6);
        const px = ZONES[s] * w;
        const alive = snap.alive[s];
        const energy = alive ? 0.55 + flash[s] * 0.45 : 0.14;
        const grad = ctx.createLinearGradient(px - 26, 0, px + 26, 0);
        const col = alive ? (s % 2 === 0 ? '255,216,77' : '139,92,246') : '244,63,94';
        grad.addColorStop(0, `rgba(${col},0)`);
        grad.addColorStop(0.5, `rgba(${col},${0.5 * energy + flash[s] * 0.3})`);
        grad.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = grad;
        ctx.fillRect(px - 26, h * 0.08, 52, h * 0.84);
        // core line
        ctx.fillStyle = `rgba(${col},${0.75 * energy})`;
        ctx.fillRect(px - 1, h * 0.08, 2, h * 0.84);
      }

      // ── particles ──────────────────────────────────────────────────────────
      const zoneOf = (x: number) => {
        const f = x / w;
        if (f < ZONES[0]) return 0;
        if (f < ZONES[1]) return 1;
        if (f < ZONES[2]) return 2;
        if (f < ZONES[3]) return 3;
        return 3;
      };
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const zone = zoneOf(Math.max(0, p.x));
        const slow = hFrac[zone];
        p.x += p.speed * w * dt * (0.55 + slow * 0.95);
        p.wobble += dt * p.wob * 2.2;
        if (p.x > w + 8) { particles.splice(i, 1); continue; }
        // crossing detection → flash
        for (let s = 0; s < 4; s++) {
          const px = ZONES[s] * w;
          if (p.x - p.speed * w * dt * 2 < px && p.x >= px) flash[s] = Math.min(1, flash[s] + 0.09);
        }

        const y = midY + Math.sin(p.wobble) * laneH * 0.34 + p.lane * laneH;
        const r = p.size;
        const glow = p.red ? '244,63,94' : zone === 3 && p.x > ZONES[3] * w ? '167,139,250' : '255,216,77';
        ctx.beginPath();
        ctx.shadowColor = `rgba(${glow},0.9)`;
        ctx.shadowBlur = 7;
        ctx.fillStyle = `rgba(${glow},0.95)`;
        ctx.arc(p.x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // ── dead-stage warning shimmer ─────────────────────────────────────────
      for (let s = 0; s < 4; s++) {
        if (snap.alive[s]) continue;
        const px = ZONES[s] * w;
        ctx.font = '600 9px JetBrains Mono';
        ctx.fillStyle = `rgba(244,63,94,${0.65 + Math.sin(now / 180) * 0.35})`;
        ctx.textAlign = 'center';
        ctx.fillText('OFFLINE', px, 12);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [height, density]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-[#0a0716] border border-line">
      <canvas ref={canvasRef} height={height} aria-hidden="true" />
      {/* stage labels */}
      <div className="absolute inset-0 pointer-events-none font-mono text-[8.5px] sm:text-[9.5px] tracking-[0.14em]">
        {[['INGESTION', 16], ['REDPANDA', 40], ['WASM', 66], ['POSTGRES', 90]].map(([label, left]) => (
          <span key={label as string} className="absolute bottom-1.5 -translate-x-1/2 text-violet-mist/60" style={{ left: `${left}%` }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
