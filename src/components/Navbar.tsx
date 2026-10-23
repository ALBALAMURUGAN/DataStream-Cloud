import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Radio } from 'lucide-react';
import { Logo } from './ui';
import { useEngine } from '../lib/useEngine';
import { fmtCompact } from '../lib/engine';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/console', label: 'Live Console' },
  { to: '/pipeline', label: 'Stream Sim' },
  { to: '/datasets', label: 'Datasets' },
  { to: '/anomalies', label: 'Anomalies' },
  { to: '/architecture', label: 'Architecture' },
  { to: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const snap = useEngine();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <header className="fixed top-0 inset-x-0 z-50">
      {/* live status strip */}
      <div className="hidden md:flex items-center justify-center gap-6 h-7 bg-obsidian/95 border-b border-line font-mono text-[9.5px] tracking-wider text-violet-mist/70">
        <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ALL SYSTEMS OPERATIONAL</span>
        <span className="text-gold/90">◈ {fmtCompact(snap.actualEps || snap.eventsPerSec)} events/s live</span>
        <span>REGIONS: us-east-1 · eu-west-1 · ap-south-1 · sa-east-1</span>
        <span className="text-violet-soft/80">SLO 99.99% · p99 &lt; 150ms</span>
      </div>

      <div className={`transition-all duration-500 border-b ${scrolled ? 'bg-obsidian/85 backdrop-blur-xl border-line shadow-lg shadow-black/40' : 'bg-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" aria-label="DataStream Cloud home"><Logo /></Link>

          <nav className="hidden lg:flex items-center gap-1" aria-label="Primary">
            {LINKS.map(l => {
              const active = pathname === l.to;
              return (
                <Link key={l.to} to={l.to}
                  className={`relative px-3 py-2 text-[12.5px] font-medium rounded-lg transition-colors ${active ? 'text-gold' : 'text-violet-mist/75 hover:text-white'}`}>
                  {l.label}
                  {active && <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-lg bg-gold/10 border border-gold/25" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                </Link>
              );
            })}
          </nav>

          <button onClick={() => navigate('/console')}
            className="hidden md:inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-bold tracking-wide text-[#241a05] bg-gradient-to-br from-gold-soft via-gold to-gold-deep shadow-[0_0_22px_rgba(255,216,77,0.35),inset_0_1px_0_rgba(255,255,255,0.7)] hover:shadow-[0_0_32px_rgba(255,216,77,0.5)] hover:-translate-y-0.5 transition-all">
            <Radio size={14} strokeWidth={2.5} /> OPEN CONSOLE
          </button>

          <button className="lg:hidden text-violet-mist p-2" onClick={() => setOpen(o => !o)} aria-label="Toggle menu">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden bg-obsidian/97 backdrop-blur-2xl border-t border-line">
              <div className="px-5 py-4 grid grid-cols-2 gap-2">
                {LINKS.map(l => (
                  <Link key={l.to} to={l.to}
                    className={`px-4 py-3 rounded-xl text-[13px] font-medium border ${pathname === l.to ? 'border-gold/40 text-gold bg-gold/10' : 'border-line text-violet-mist/85 bg-panel'}`}>
                    {l.label}
                  </Link>
                ))}
                <button onClick={() => navigate('/console')} className="col-span-2 h-12 rounded-xl font-bold text-[#241a05] bg-gradient-to-r from-gold-soft to-gold-deep">
                  OPEN LIVE CONSOLE →
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
