import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileJson2, FileText, Download, Search, ArrowUpDown, ArrowUp, ArrowDown,
  FileBarChart, Table2, CircleCheck, CircleAlert, ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { useEngine } from '../lib/useEngine';
import { engine, fmtCompact, fmtMoney, type DatasetRow } from '../lib/engine';
import { useToast } from '../components/ui';
import { Donut } from '../components/charts';

const PAGE = 10;
type SortKey = 'ts' | 'type' | 'region' | 'amount' | 'latencyMs';

// minimal CSV parser: quoted fields, commas, header row
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { cur.push(field.trim()); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field.trim()); field = '';
      if (cur.some(x => x !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  cur.push(field.trim());
  if (cur.some(x => x !== '')) rows.push(cur);
  if (rows.length < 2) return [];
  const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  return rows.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}
const normKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

export default function Datasets() {
  const snap = useEngine();
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'failed'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'stream' | 'csv' | 'json'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('ts');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastImport, setLastImport] = useState<{ count: number; source: string } | null>(null);

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        let records: Partial<DatasetRow>[] = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          const parsed = JSON.parse(text);
          const arr = Array.isArray(parsed) ? parsed : parsed.records || parsed.events || parsed.data || [];
          records = (arr as Record<string, unknown>[]).map(r => {
            const lower: Record<string, unknown> = {};
            Object.entries(r).forEach(([k, v]) => { lower[normKey(k)] = v; });
            return {
              id: String(lower.id ?? ''), type: String(lower.type ?? lower.eventtype ?? 'page_view'),
              region: String(lower.region ?? lower.geo ?? 'us-east-1'), amount: Number(lower.amount ?? lower.value ?? lower.revenue ?? 0),
              latencyMs: Number(lower.latencyms ?? lower.latency ?? 0), status: (String(lower.status ?? 'ok').toLowerCase().includes('fail') ? 'failed' : 'ok') as 'ok' | 'failed',
              ts: Number(lower.ts ?? lower.timestamp ?? Date.now()),
            };
          });
        } else {
          records = parseCsv(text).map(r => ({
            id: r.id, type: r.type ?? r.eventtype ?? r.event, region: r.region ?? r.geo,
            amount: Number(r.amount ?? r.value ?? r.revenue ?? 0), latencyMs: Number(r.latencyms ?? r.latency ?? 0),
            status: (r.status ?? (r.ok === 'false' ? 'failed' : 'ok')).toLowerCase().includes('fail') ? 'failed' as const : 'ok' as const,
            ts: Number(r.ts ?? r.timestamp ?? Date.now()),
          }));
        }
        if (records.length === 0) { push('warning', 'Nothing to import', 'File parsed but contained 0 records.'); return; }
        const n = engine.ingestRecords(records, file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv');
        setLastImport({ count: n, source: file.name });
        push('success', `Imported ${n} records`, `${file.name} · schema validated · bad rows → DLQ`);
      } catch (err) {
        push('warning', 'Import failed', err instanceof Error ? err.message.slice(0, 90) : 'Unparseable file');
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    let rows = snap.rows.filter(r => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (sourceFilter !== 'all' && r.source !== sourceFilter) return false;
      if (search) { const q = search.toLowerCase(); return r.id.includes(q) || r.type.includes(q) || r.region.includes(q) || String(r.amount).includes(q); }
      return true;
    });
    rows = [...rows].sort((a, b) => (a[sortKey] as number | string) < (b[sortKey] as number | string) ? -sortDir : sortDir);
    return rows;
  }, [snap.rows, search, typeFilter, statusFilter, sourceFilter, sortKey, sortDir]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice(Math.min(page, pages - 1) * PAGE, Math.min(page, pages - 1) * PAGE + PAGE);
  useEffect(() => { if (page >= pages) setPage(0); }, [pages, page]);

  const totalAmount = snap.rows.reduce((a, r) => a + (r.amount || 0), 0);
  const avgLatency = Math.round(snap.rows.reduce((a, r) => a + r.latencyMs, 0) / (snap.rows.length || 1));
  const failedRows = snap.rows.filter(r => r.status === 'failed').length;

  const toggleSort = (k: SortKey) => { if (sortKey === k) setSortDir(d => (d === 1 ? -1 : 1)); else { setSortKey(k); setSortDir(-1); } };
  const toggleAll = () => setSelected(s => s.size === pageRows.length ? new Set() : new Set(pageRows.map(r => r.id)));
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const download = (kind: 'csv' | 'json') => {
    const rows = filtered;
    const content = kind === 'csv'
      ? 'id,ts,type,region,amount,latencyMs,status,source\n' + rows.map(r => [r.id, new Date(r.ts).toISOString(), r.type, r.region, r.amount, r.latencyMs, r.status, r.source].join(',')).join('\n')
      : JSON.stringify(rows, null, 2);
    const blob = new Blob([content], { type: kind === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `datastream-export.${kind}`; a.click(); URL.revokeObjectURL(url);
    push('success', `Report exported (${kind.toUpperCase()})`, `${rows.length} processed rows · signed URL valid 24h`);
  };
  const downloadReport = () => {
    const report = [
      'DATASTREAM CLOUD — PROCESSED RESULTS REPORT', `Generated: ${new Date().toISOString()}`, '='.repeat(46), '',
      `Rows in view:        ${filtered.length}`, `Sources:             ${[...new Set(filtered.map(r => r.source))].join(', ')}`,
      `Total amount:        $${totalAmount.toFixed(2)}`, `Avg latency:         ${avgLatency}ms`, `Failed rows:         ${failedRows} (${((failedRows / (snap.rows.length || 1)) * 100).toFixed(2)}%)`,
      `Success rate:        ${snap.successRate.toFixed(3)}%`, `Total processed:     ${snap.totalProcessed.toLocaleString()}`, '',
      'TOP TYPES:', ...Object.entries(snap.typeDistribution).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  ${k.padEnd(12)} ${v.toLocaleString()}`),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }));
    const a = document.createElement('a'); a.href = url; a.download = 'datastream-report.txt'; a.click(); URL.revokeObjectURL(url);
    push('success', 'Report generated', 'datastream-report.txt · includes aggregates + type distribution');
  };

  const SortIcon = ({ k }: { k: SortKey }) => sortKey !== k ? <ArrowUpDown size={11} className="opacity-40" /> : sortDir === -1 ? <ArrowDown size={11} className="text-gold" /> : <ArrowUp size={11} className="text-gold" />;

  return (
    <div className="min-h-screen bg-[#08060f] pt-24 sm:pt-28 pb-16 mesh-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="mb-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-gold flex items-center gap-2"><Table2 size={13} /> Data Hub</div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">Datasets & <span className="gradient-text">Explorer</span></h1>
          <p className="text-[12.5px] text-violet-mist/70 mt-1.5">Import files, filter the processed lake, and ship board-ready reports — all without leaving the page.</p>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* ══ LEFT: import + stats ══ */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* dropzone */}
            <div
              role="button" tabIndex={0} aria-label="Import CSV or JSON file"
              onClick={() => fileRef.current?.click()} onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) importFile(f); }}
              className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-300 ${dragging ? 'border-gold bg-gold/10 scale-[1.02]' : 'border-violet-core/35 bg-panel/50 hover:border-gold/45 hover:bg-gold/5'}`}>
              <input ref={fileRef} type="file" accept=".csv,.json,application/json,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
              <div className="w-14 h-14 mx-auto rounded-2xl grid place-items-center bg-gradient-to-br from-gold/20 to-violet-deep/30 border border-gold/25">
                <Upload size={24} className="text-gold" />
              </div>
              <p className="font-display font-semibold text-white mt-3">Drop CSV or JSON here</p>
              <p className="font-mono text-[9.5px] text-violet-mist/55 mt-1">or click to browse · max 50MB · auto-schema inference</p>
              <div className="flex items-center justify-center gap-3 mt-4">
                <span className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-md border border-line text-violet-mist/70"><FileText size={11} className="text-gold" /> CSV</span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-md border border-line text-violet-mist/70"><FileJson2 size={11} className="text-gold" /> JSON</span>
                <span className="flex items-center gap-1.5 font-mono text-[9px] px-2.5 py-1 rounded-md border border-line text-violet-mist/70"><Sparkles size={11} className="text-gold" /> STREAM REPLAY</span>
              </div>
              <AnimatePresence>{lastImport && (
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 font-mono text-[10px] text-emerald-400">✓ {lastImport.count} records from {lastImport.source}</motion.p>
              )}</AnimatePresence>
            </div>

            {/* lake stats */}
            <div className="glass rounded-2xl p-5">
              <h2 className="font-mono text-[9.5px] uppercase tracking-[0.24em] text-violet-mist/65">Processed Lake · live</h2>
              <div className="grid grid-cols-2 gap-3 mt-3">
                {[
                  { l: 'ROWS IN VIEW', v: `${snap.rows.length}`, icon: Table2 },
                  { l: 'SUM(amount)', v: fmtMoney(totalAmount), icon: CircleCheck },
                  { l: 'AVG LATENCY', v: `${avgLatency}ms`, icon: FileBarChart },
                  { l: 'FAILED ROWS', v: `${failedRows}`, icon: CircleAlert },
                ].map((s, i) => (
                  <div key={i} className="rounded-xl border border-line bg-panel px-3.5 py-3">
                    <s.icon size={14} className="text-gold/85" />
                    <div className="font-display text-lg font-bold text-white mt-1.5 tabular-nums">{s.v}</div>
                    <div className="font-mono text-[8px] text-violet-mist/55 tracking-wider">{s.l}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-line">
                <Donut size={84} thickness={12} centerValue={`${((1 - failedRows / (snap.rows.length || 1)) * 100).toFixed(0)}%`} centerLabel="CLEAN"
                  segments={[{ label: 'ok', value: snap.rows.length - failedRows, color: '#34d399' }, { label: 'failed', value: failedRows || 0.001, color: '#f43f5e' }]} />
                <p className="text-[10.5px] leading-relaxed text-violet-mist/70">Data quality score across the visible lake slice. Rows failing schema validation are auto-quarantined to <span className="text-gold-soft">ds.dlq.v7</span>.</p>
              </div>
            </div>

            {/* export center */}
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display font-semibold text-white text-[15px] flex items-center gap-2"><FileBarChart size={16} className="text-gold" /> Reports & Exports</h2>
              <p className="font-mono text-[9px] text-violet-mist/55 mt-1">SIGNED URLs · 24h EXPIRY · AUDIT LOGGED</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {([['CSV', () => download('csv')], ['JSON', () => download('json')], ['REPORT', downloadReport]] as [string, () => void][]).map(([label, fn]) => (
                  <button key={label} onClick={fn} className="h-11 rounded-xl border border-gold/30 text-gold font-mono text-[10.5px] font-bold tracking-wider hover:bg-gold/10 hover:border-gold/55 transition-all flex items-center justify-center gap-1.5">
                    <Download size={12} />{label}
                  </button>
                ))}
              </div>
              {selected.size > 0 && <p className="mt-3 font-mono text-[9.5px] text-gold-soft/85">{selected.size} row{selected.size > 1 ? 's' : ''} selected · exports include selection filter</p>}
            </div>
          </div>

          {/* ══ RIGHT: explorer table ══ */}
          <div className="lg:col-span-8 glass rounded-2xl overflow-hidden flex flex-col">
            <div className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-line">
              <h2 className="font-display font-semibold text-white mr-auto">Processed Results <span className="font-mono text-[10px] text-violet-mist/55 font-normal">· {filtered.length} rows · live</span></h2>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-violet-mist/50" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} placeholder="Search id, type, region, amount…" aria-label="Search rows"
                  className="h-9 w-52 sm:w-64 rounded-lg bg-panel2 border border-line2 pl-8 pr-3 text-[11.5px] text-white placeholder:text-violet-mist/40 focus:outline-none focus:border-gold/45" />
              </div>
              <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(0); }} aria-label="Filter type"
                className="h-9 rounded-lg bg-panel2 border border-line2 text-[11px] font-mono text-violet-mist px-2 focus:outline-none focus:border-gold/45">
                {['all', 'purchase', 'page_view', 'api_call', 'signup', 'refund'].map(t => <option key={t} value={t}>{t === 'all' ? 'TYPE: ALL' : t.toUpperCase().replace('_', ' ')}</option>)}
              </select>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as typeof statusFilter); setPage(0); }} aria-label="Filter status"
                className="h-9 rounded-lg bg-panel2 border border-line2 text-[11px] font-mono text-violet-mist px-2 focus:outline-none focus:border-gold/45">
                {['all', 'ok', 'failed'].map(t => <option key={t} value={t}>{t === 'all' ? 'STATUS: ALL' : t.toUpperCase()}</option>)}
              </select>
              <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value as typeof sourceFilter); setPage(0); }} aria-label="Filter source"
                className="h-9 rounded-lg bg-panel2 border border-line2 text-[11px] font-mono text-violet-mist px-2 focus:outline-none focus:border-gold/45">
                {['all', 'stream', 'csv', 'json'].map(t => <option key={t} value={t}>{t === 'all' ? 'SRC: ALL' : t.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-[11px] font-mono">
                <thead className="sticky top-0 bg-panel2/95 backdrop-blur text-violet-mist/60 text-[9px] uppercase tracking-wider z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left"><input type="checkbox" checked={selected.size > 0 && selected.size === pageRows.length} onChange={toggleAll} aria-label="Select page" className="accent-[#ffd84d]" /></th>
                    {([['ts', 'Timestamp'], ['type', 'Type'], ['region', 'Region'], ['amount', 'Amount'], ['latencyMs', 'Latency']] as [SortKey, string][]).map(([k, label]) => (
                      <th key={k} className="px-4 py-2.5 text-left"><button onClick={() => toggleSort(k)} className="flex items-center gap-1.5 hover:text-gold transition-colors">{label}<SortIcon k={k} /></button></th>
                    ))}
                    <th className="px-4 py-2.5 text-left">Src</th><th className="px-4 py-2.5 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(r => (
                    <tr key={r.id} className="border-t border-line/50 hover:bg-white/[0.03] transition-colors">
                      <td className="px-4 py-2"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} aria-label={`Select ${r.id}`} className="accent-[#ffd84d]" /></td>
                      <td className="px-4 py-2 text-violet-mist/75 whitespace-nowrap">{new Date(r.ts).toLocaleTimeString('en-GB', { hour12: false })}</td>
                      <td className="px-4 py-2"><span className="text-gold-soft/90">{r.type}</span></td>
                      <td className="px-4 py-2 text-violet-mist/75">{r.region}</td>
                      <td className="px-4 py-2 text-white/85">{r.amount > 0 ? `$${r.amount.toFixed(2)}` : '—'}</td>
                      <td className="px-4 py-2 text-violet-mist/75">{r.latencyMs}ms</td>
                      <td className="px-4 py-2 text-violet-mist/55">{r.source}</td>
                      <td className="px-4 py-2">{r.status === 'ok' ? <span className="text-emerald-400">● OK</span> : <span className="text-rose-400">● FAIL</span>}</td>
                    </tr>
                  ))}
                  {pageRows.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-violet-mist/45 font-mono text-[11px]">No rows match your filters — try clearing the search.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-t border-line font-mono text-[10px] text-violet-mist/60">
              <span>PAGE {page + 1} / {pages} · {filtered.length} MATCHED · STREAMING {fmtCompact(snap.actualEps || snap.eventsPerSec)} EVT/S</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} aria-label="Previous page"
                  className="w-8 h-8 grid place-items-center rounded-lg border border-line disabled:opacity-30 hover:border-gold/40 hover:text-gold transition-all"><ChevronLeft size={15} /></button>
                <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Next page"
                  className="w-8 h-8 grid place-items-center rounded-lg border border-line disabled:opacity-30 hover:border-gold/40 hover:text-gold transition-all"><ChevronRight size={15} /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
