import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

// ── Logo ─────────────────────────────────────────────────────────────────────
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect x="2" y="2" width="60" height="60" rx="15" fill="#141126" stroke="rgba(255,216,77,0.35)" strokeWidth="2" />
        <path d="M10 26 H24 L29 14 L36 44 L42 26 H54" fill="none" stroke="url(#lg)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffd84d" /><stop offset=".5" stopColor="#f5b301" /><stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="font-display font-bold text-[17px] tracking-tight text-white">DataStream<span className="gold-text"> Cloud</span></div>
          <div className="font-mono text-[8.5px] tracking-[0.22em] text-violet-mist/60 mt-1 uppercase">Realtime Analytics Fabric</div>
        </div>
      )}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeading({ eyebrow, title, sub, align = 'center' }: {
  eyebrow: string; title: ReactNode; sub?: string; align?: 'center' | 'left';
}) {
  return (
    <div className={`${align === 'center' ? 'text-center mx-auto items-center' : 'text-left items-start'} flex flex-col max-w-3xl mb-14`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-deep" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.28em] text-gold">{eyebrow}</span>
        <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-deep" />
      </div>
      <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold leading-[1.12] tracking-tight text-white">{title}</h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-violet-mist/75 max-w-2xl">{sub}</p>}
    </div>
  );
}

// ── Toast system ──────────────────────────────────────────────────────────────
type ToastKind = 'success' | 'warning' | 'info';
interface Toast { id: number; kind: ToastKind; title: string; detail?: string }
const ToastCtx = createContext<{ push: (kind: ToastKind, title: string, detail?: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

let toastId = 0;
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: ToastKind, title: string, detail?: string) => {
    const id = ++toastId;
    setToasts(t => [...t.slice(-2), { id, kind, title, detail }]);
    window.setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4600);
  }, []);
  const icons = { success: CheckCircle2, warning: AlertTriangle, info: Info };
  const colors = {
    success: 'border-emerald-400/30 text-emerald-300',
    warning: 'border-gold/40 text-gold',
    info: 'border-violet-core/40 text-violet-mist',
  };
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-6 right-5 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]">
        <AnimatePresence>
          {toasts.map(t => {
            const Icon = icons[t.kind];
            return (
              <motion.div key={t.id} layout initial={{ opacity: 0, x: 80, scale: .9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: .95 }}
                className={`glass rounded-xl border ${colors[t.kind]} px-4 py-3 shadow-2xl shadow-black/50 flex items-start gap-3`}>
                <Icon size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-white leading-snug">{t.title}</p>
                  {t.detail && <p className="text-[11px] text-violet-mist/70 mt-1 leading-snug font-mono">{t.detail}</p>}
                </div>
                <button onClick={() => setToasts(s => s.filter(x => x.id !== t.id))} className="ml-auto text-violet-mist/50 hover:text-white transition-colors" aria-label="Dismiss">
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

// ── KPI card used across dashboards ──────────────────────────────────────────
export function KpiCard({ label, value, unit, delta, deltaUp, icon: Icon, accent = 'gold', spark }: {
  label: string; value: string; unit?: string; delta?: string; deltaUp?: boolean;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent?: 'gold' | 'violet';
  spark?: ReactNode;
}) {
  return (
    <div className="card-glow rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
      <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 transition-opacity group-hover:opacity-35 ${accent === 'gold' ? 'bg-gold-deep' : 'bg-violet-deep'}`} />
      <div className="relative">
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-violet-mist/65">{label}</span>
          <span className={`w-7 h-7 grid place-items-center rounded-lg border ${accent === 'gold' ? 'border-gold/25 bg-gold/10 text-gold' : 'border-violet-core/30 bg-violet-core/10 text-violet-soft'}`}>
            <Icon size={14} />
          </span>
        </div>
        <div className="mt-2.5 flex items-end gap-1.5">
          <span className="font-display text-[26px] sm:text-[29px] leading-none font-bold text-white tracking-tight">{value}</span>
          {unit && <span className="font-mono text-[11px] text-violet-mist/70 mb-[3px]">{unit}</span>}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          {delta && (
            <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-md ${deltaUp ? 'text-emerald-300 bg-emerald-400/10' : 'text-rose-300 bg-rose-400/10'}`}>
              {delta}
            </span>
          )}
          {spark && <span className="ml-auto opacity-90">{spark}</span>}
        </div>
      </div>
    </div>
  );
}
