import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, ArrowRight, Rocket, Waves, Building2, Calculator } from 'lucide-react';
import { useToast } from '../components/ui';

const TIERS = [
  {
    name: 'Developer', icon: Waves, price: 0, tagline: 'For weekend warriors & OSS',
    cta: 'Start free', featured: false,
    features: ['500K events / month', '1 pipeline · 2 topics', 'Community Slack (48h)', '7-day retention', 'Shared multi-tenant cluster', 'CSV / JSON import'],
    missing: ['Exactly-once semantics', 'Anomaly detection', 'SSO / SAML', 'Dedicated support'],
  },
  {
    name: 'Scale', icon: Rocket, price: 2490, tagline: 'For data teams in production',
    cta: 'Start 14-day trial', featured: true,
    features: ['250M events / month', 'Unlimited pipelines · 24 topics', 'p99 SLO 100ms · 99.99% SLA', '90-day retention + Parquet lake', 'Exactly-once + DLQ + circuit breakers', 'Streaming anomaly detection', 'WebSocket fanout · 40K clients', 'Priority support · 15min response'],
    missing: ['Dedicated single-tenant cluster', 'Custom WASM transforms SLA'],
  },
  {
    name: 'Enterprise', icon: Building2, price: -1, tagline: 'For planetary-scale fabrics',
    cta: 'Talk to us', featured: false,
    features: ['Unlimited events · BYO Redpanda / Kafka', 'Single-tenant · VPC peering · PrivateLink', 'Custom SLAs · dedicated TAM', 'Unlimited retention · 7-year cold archive', 'SSO / SCIM · audit log export', 'In-VPC WASM transform sandbox', '24/7 phone + incident bridge · 5min', 'Contractual error-budget guarantees'],
    missing: [],
  },
];

const MATRIX: [string, string | boolean, string | boolean, string | boolean][] = [
  ['Events / month', '500K', '250M', 'Unlimited'],
  ['CSV & JSON import', true, true, true],
  ['Streaming WASM transforms', true, true, true],
  ['WebSocket live fanout', true, true, true],
  ['Exactly-once delivery', false, true, true],
  ['Anomaly detection engine', false, true, true],
  ['Circuit breakers + DLQ', false, true, true],
  ['SSO / SAML / SCIM', false, false, true],
  ['Dedicated cluster', false, false, true],
  ['99.99% SLA with credits', false, true, true],
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);
  const [events, setEvents] = useState(250); // millions
  const { push } = useToast();
  const navigate = useNavigate();

  const estMonthly = annual
    ? Math.round(events * 8.4 * 0.8)
    : Math.round(events * 8.4);
  const batchEquiv = Math.round(events * 0.41 + 3400); // modeled ETL+warehouse spend for same volume
  const savings = Math.max(0, batchEquiv - estMonthly);

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-20 mesh-hero grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold">Pricing</div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-white tracking-tight mt-3">Pay for <span className="gradient-text">flow</span>,<br />never for idle.</h1>
          <p className="text-[13.5px] text-violet-mist/75 mt-4 max-w-md mx-auto">Per-event pricing with volume decay. No cluster fees, no seat fees, no surprises in the invoice PDF.</p>
          <div className="inline-flex items-center gap-3 mt-6 p-1.5 rounded-2xl border border-line bg-panel">
            <button onClick={() => setAnnual(false)} className={`h-9 px-5 rounded-xl text-[12px] font-semibold transition-all ${!annual ? 'bg-panel2 text-white border border-line2' : 'text-violet-mist/60'}`}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={`h-9 px-5 rounded-xl text-[12px] font-semibold transition-all flex items-center gap-2 ${annual ? 'bg-gold text-[#241a05]' : 'text-violet-mist/60'}`}>Annual <span className={`font-mono text-[8.5px] px-1.5 py-0.5 rounded ${annual ? 'bg-[#241a05]/20 text-[#241a05]' : 'bg-emerald-400/15 text-emerald-300'}`}>SAVE 20%</span></button>
          </div>
        </div>

        {/* ── tiers ── */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {TIERS.map(tier => (
            <div key={tier.name}
              className={`relative rounded-3xl p-6 sm:p-7 flex flex-col transition-transform duration-500 ${tier.featured
                ? 'border-2 border-gold/60 bg-gradient-to-b from-gold/[0.09] via-panel to-panel shadow-[0_0_70px_rgba(245,179,1,0.14)] scale-[1.03] z-10'
                : 'border border-line2 bg-panel'}`}>
              {tier.featured && <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 font-mono text-[9px] font-bold tracking-[0.25em] text-[#241a05] bg-gradient-to-r from-gold-soft to-gold-deep px-4 py-1.5 rounded-full shadow-lg">MOST POPULAR</span>}
              <tier.icon size={26} strokeWidth={1.6} className={tier.featured ? 'text-gold' : 'text-violet-soft'} />
              <h2 className="font-display text-2xl font-bold text-white mt-3">{tier.name}</h2>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-violet-mist/55 mt-1">{tier.tagline}</p>
              <div className="mt-5 flex items-baseline gap-2">
                {tier.price === -1 ? (
                  <span className="font-display text-4xl font-bold text-white">Custom</span>
                ) : (
                  <>
                    <span className="font-display text-5xl font-bold text-white">${tier.price === 0 ? '0' : (annual ? Math.round(tier.price * 0.8) : tier.price).toLocaleString()}</span>
                    <span className="font-mono text-[10.5px] text-violet-mist/60">/{tier.price === 0 ? 'forever' : 'month'}</span>
                  </>
                )}
              </div>
              {tier.price > 0 && annual && <p className="font-mono text-[9px] text-emerald-400/85 mt-1">billed annually · {Math.round(tier.price * 12 * 0.2).toLocaleString()} USD saved vs monthly</p>}
              <ul className="mt-6 space-y-2.5 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[12px] text-violet-mist/90"><Check size={14} className="text-gold mt-0.5 shrink-0" strokeWidth={3} />{f}</li>
                ))}
                {tier.missing.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[12px] text-violet-mist/35"><X size={14} className="mt-0.5 shrink-0" />{f}</li>
                ))}
              </ul>
              <button onClick={() => tier.price === -1 ? push('info', 'Enterprise desk pinged', 'A solutions engineer will reach out within one business hour.') : navigate('/console')}
                className={`mt-6 h-12 rounded-xl font-display font-bold text-[13px] tracking-wide transition-all ${tier.featured
                  ? 'text-[#241a05] bg-gradient-to-r from-gold-soft via-gold to-gold-deep shadow-[0_6px_30px_rgba(245,179,1,0.4)] hover:-translate-y-0.5'
                  : 'text-gold border border-gold/40 hover:bg-gold/10'}`}>
                {tier.cta} <ArrowRight size={14} className="inline -mt-0.5" />
              </button>
            </div>
          ))}
        </div>

        {/* ── ROI calculator ── */}
        <div className="glass rounded-3xl p-6 sm:p-8 mt-8 grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-display text-2xl font-bold text-white flex items-center gap-3"><Calculator className="text-gold" size={24} /> Volume <span className="gold-text">calculator</span></h2>
            <p className="text-[12.5px] text-violet-mist/75 mt-2">Drag the dial. Watch what batch ETL would have cost you — modeled from 914 real migrations.</p>
            <div className="mt-6">
              <div className="flex items-baseline justify-between mb-2">
                <label htmlFor="vol" className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-violet-mist/65">Monthly event volume</label>
                <span className="font-display text-2xl font-bold text-gold-soft tabular-nums">{events}M<span className="text-[11px] font-mono text-violet-mist/60"> evt/mo</span></span>
              </div>
              <input id="vol" type="range" min={10} max={2000} step={10} value={events} onChange={e => setEvents(Number(e.target.value))}
                className="ds-range w-full" style={{ ['--fill' as string]: `${(events / 2000) * 100}%` }} aria-label="Monthly event volume in millions" />
              <div className="flex justify-between font-mono text-[8.5px] text-violet-mist/45 mt-1"><span>10M</span><span>500M</span><span>1B</span><span>1.5B</span><span>2B</span></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-violet-mist/55">DataStream Scale</div>
              <div className="font-display text-3xl font-bold text-gold-soft mt-2">${estMonthly.toLocaleString()}</div>
              <div className="font-mono text-[9px] text-violet-mist/55 mt-1">per month · {annual ? 'annual' : 'monthly'} billing</div>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-violet-mist/55">Batch ETL + Warehouse</div>
              <div className="font-display text-3xl font-bold text-violet-mist/70 mt-2 line-through decoration-rose-400/60">${batchEquiv.toLocaleString()}</div>
              <div className="font-mono text-[9px] text-violet-mist/55 mt-1">airflow + cron + compute + seats</div>
            </div>
            <div className="col-span-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.07] p-5 flex items-center justify-between">
              <div>
                <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-emerald-300/90">You keep, every month</div>
                <div className="font-display text-4xl font-bold text-emerald-300 mt-1">${savings.toLocaleString()}</div>
              </div>
              <div className="text-right"><div className="font-display text-2xl font-bold text-white">{batchEquiv > 0 ? Math.round((savings / batchEquiv) * 100) : 0}%</div><div className="font-mono text-[8.5px] text-violet-mist/55">LESS SPEND<br />SAME DATA</div></div>
            </div>
          </div>
        </div>

        {/* ── comparison matrix ── */}
        <div className="mt-12 overflow-x-auto">
          <h2 className="font-display text-2xl font-bold text-white mb-4">Every tier, <span className="violet-text">line by line</span></h2>
          <table className="w-full min-w-[640px] text-[12px] border border-line rounded-2xl overflow-hidden border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr className="bg-panel2 font-mono text-[10px] uppercase tracking-[0.2em] text-violet-mist/70">
                <th className="text-left px-5 py-3.5">Capability</th><th className="px-4 py-3.5">Developer</th><th className="px-4 py-3.5 text-gold">Scale</th><th className="px-4 py-3.5">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([cap, d, s, e], i) => (
                <tr key={i} className={i % 2 ? 'bg-panel/40' : 'bg-transparent'}>
                  <td className="px-5 py-3 text-violet-mist/85 border-t border-line">{cap}</td>
                  {[d, s, e].map((v, j) => (
                    <td key={j} className="px-4 py-3 text-center border-t border-line">{typeof v === 'boolean' ? (v ? <Check size={15} className="inline text-gold" strokeWidth={3} /> : <X size={14} className="inline text-violet-mist/30" />) : v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
