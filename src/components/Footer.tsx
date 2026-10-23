import { Link } from 'react-router-dom';
import { Github, Twitter, Rss, MessageSquare } from 'lucide-react';
import { Logo } from './ui';

const COLS: { title: string; links: { label: string; to: string }[] }[] = [
  { title: 'Platform', links: [
    { label: 'Live Console', to: '/console' }, { label: 'Stream Simulator', to: '/pipeline' },
    { label: 'Datasets & Explorer', to: '/datasets' }, { label: 'Anomaly Detection', to: '/anomalies' }, { label: 'Reports & Exports', to: '/datasets' },
  ]},
  { title: 'Stack', links: [
    { label: 'React · TypeScript', to: '/architecture' }, { label: 'Node.js · WebSockets', to: '/architecture' },
    { label: 'Python · psycopg3', to: '/architecture' }, { label: 'Redpanda · Kafka API', to: '/architecture' },
    { label: 'PostgreSQL · Redis', to: '/architecture' },
  ]},
  { title: 'Company', links: [
    { label: 'Architecture', to: '/architecture' }, { label: 'Pricing', to: '/pricing' },
    { label: 'Security & SOC 2', to: '/architecture' }, { label: 'Status Page', to: '/console' },
  ]},
];

export default function Footer() {
  return (
    <footer className="relative border-t border-line bg-[#0a0817]">
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-3">
            <Logo />
            <p className="mt-4 text-[13px] leading-relaxed text-violet-mist/70 max-w-xs">
              The real-time cloud data processing & analytics fabric. Ingest anything, process continuously, query instantly.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {[Github, Twitter, Rss, MessageSquare].map((Icon, i) => (
                <a key={i} href={['https://github.com', 'https://x.com', '/architecture', '/pricing'][i]}
                  {...(i < 2 ? { target: '_blank', rel: 'noreferrer' } : {})}
                  aria-label="Social link"
                  className="w-9 h-9 grid place-items-center rounded-lg border border-line text-violet-mist/70 hover:text-gold hover:border-gold/40 transition-all">
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>
          {COLS.map(col => (
            <nav key={col.title} className="lg:col-span-2" aria-label={col.title}>
              <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold/80 mb-3">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map(l => (
                  <li key={l.label}><Link to={l.to} className="text-[12.5px] text-violet-mist/70 hover:text-white transition-colors">{l.label}</Link></li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="lg:col-span-3">
            <h3 className="font-mono text-[10px] uppercase tracking-[0.24em] text-gold/80 mb-3">Subscribe to Telemetry</h3>
            <p className="text-[12px] text-violet-mist/65 mb-3">One email per month. Latency budgets, not fluff.</p>
            <form className="flex rounded-xl overflow-hidden border border-line focus-within:border-gold/40 transition-colors"
              onSubmit={e => {
                e.preventDefault();
                const input = e.currentTarget.elements.namedItem('email') as HTMLInputElement;
                if (input.value) { input.value = ''; input.placeholder = 'Welcome to the stream ✓'; }
              }}>
              <label htmlFor="foot-email" className="sr-only">Work email</label>
              <input id="foot-email" name="email" type="email" required placeholder="you@company.com"
                className="flex-1 min-w-0 bg-panel px-3 py-2.5 text-[12.5px] placeholder:text-violet-mist/35 focus:outline-none" />
              <button type="submit" className="px-4 bg-gradient-to-r from-violet-deep to-violet-core text-[12px] font-semibold text-white hover:brightness-110 transition">Join</button>
            </form>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] tracking-wider text-violet-mist/45">
          <span>© 2026 DATASTREAM CLOUD INC · SOC 2 TYPE II · ISO 27001 · GDPR</span>
          <div className="flex items-center gap-5">
            <Link to="/architecture" className="hover:text-gold transition-colors">SECURITY</Link>
            <Link to="/pricing" className="hover:text-gold transition-colors">SLA 99.99%</Link>
            <Link to="/console" className="hover:text-gold transition-colors">STATUS: <span className="text-emerald-400">OPERATIONAL</span></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
