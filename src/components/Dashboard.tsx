import { useEffect, useState } from 'preact/hooks';
import { ArrowDown, ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown, ChevronRight, CircleHelp, Copy, ExternalLink, Globe2, Info, Laptop, LayoutGrid, LineChart, Menu, Monitor, Moon, RefreshCw, Search, SlidersHorizontal, Smartphone, Sparkles, Sun, X } from 'lucide-preact';
import { csvExport, defaultQuery, devices, metrics, monthLabel, parseQuery, percent, queryKey, regions, seriesColor, type Dataset, type Device, type Metric, type Query, type Region } from '../lib/model';
import TeeChart from './TeeChart';
import BrandMark from './BrandMark';

const localCache = new Map<string, { data: Dataset; time: number }>();
const metricIcons = { browser: Globe2, os: Monitor, search: Search, platform: Smartphone };
function download(content: Blob, name: string) {
  const url = URL.createObjectURL(content);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Change({ value, suffix = 'pp' }: { value: number; suffix?: string }) {
  return <span class={`change ${value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'}`}>{value >= 0 ? <ArrowUpRight size={13} /> : <ArrowDown size={13} />}{value > 0 ? '+' : ''}{percent(value)} {suffix}</span>;
}

export default function Dashboard({ initial }: { initial: Dataset }) {
  const [query, setQuery] = useState<Query>(defaultQuery);
  const [data, setData] = useState(initial);
  const [months, setMonths] = useState(12);
  const [mode, setMode] = useState<'line' | 'bar'>('line');
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [menu, setMenu] = useState(false);
  const [methodology, setMethodology] = useState(false);
  const [notice, setNotice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tableMode, setTableMode] = useState<'latest' | 'history'>('latest');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const syncTheme = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
    syncTheme();
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  useEffect(() => {
    function restore() {
      const params = new URLSearchParams(window.location.search);
      try { setQuery(parseQuery(params)); } catch { setQuery(defaultQuery); }
      const count = Number(params.get('months'));
      if ([6, 12, 24].includes(count)) setMonths(count);
      setMode(params.get('view') === 'bar' ? 'bar' : 'line');
    }
    restore(); window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ ...query, months: String(months), view: mode });
    window.history.replaceState(null, '', `?${params}`);
  }, [query, months, mode]);

  useEffect(() => {
    const key = queryKey(query);
    const cached = localCache.get(key);
    if (cached && Date.now() - cached.time < 15 * 60 * 1000) { setData(cached.data); setHidden([]); setSearchTerm(''); setError(''); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setError('');
    fetch(`/api/stats?${new URLSearchParams(query)}`, { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? 'Unable to load the data.');
      if (!Array.isArray(result.dates) || !Array.isArray(result.series) || queryKey(result) !== key) throw new Error('Unexpected data response.');
      if (controller.signal.aborted) return;
      setData(result); setHidden([]); setSearchTerm('');
      if (!result.stale) localCache.set(key, { data: result, time: Date.now() });
    }).catch(err => { if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Connection error.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!methodology) return;
    const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMethodology(false); };
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.getElementById('methodology-dialog') as HTMLDialogElement | null;
    dialog?.showModal();
    window.addEventListener('keydown', close);
    return () => { dialog?.close(); previous?.focus(); window.removeEventListener('keydown', close); };
  }, [methodology]);

  const last = data.dates.length - 1;
  const latestMonth = data.dates[last];
  const previousMonth = data.dates[last - 1];
  const top = data.series.slice(0, 6);
  const lead = top[0];
  const winner = [...data.series].sort((a, b) => (b.values[last] - b.values[last - 1]) - (a.values[last] - a.values[last - 1]))[0];
  const visibleRows = data.series.filter(s => s.name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));
  const historyDates = data.dates.slice(-months);
  const source = `https://gs.statcounter.com/${metrics[data.metric].source}`;

  function selectMetric(metric: Metric) {
    setQuery(q => ({ ...q, metric, device: metric === 'platform' ? 'all' : q.device }));
    setMenu(false);
  }
  function refreshData() { localCache.delete(queryKey(query)); setRefresh(v => v + 1); }
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('global-signals-theme', next); } catch { /* Keep the theme for this session if storage is unavailable. */ }
    setTheme(next);
  }
  function toggleSeries(name: string) {
    if (!hidden.includes(name) && hidden.length === top.length - 1) { setNotice('Keep at least one series visible.'); return; }
    setHidden(h => h.includes(name) ? h.filter(n => n !== name) : [...h, name]);
  }
  async function share() {
    try { await navigator.clipboard.writeText(window.location.href); setNotice('Link copied. Share your perspective!'); }
    catch { setNotice('Copy the link from your address bar to share this view.'); }
  }
  function exportCsv() {
    const metadata = `# Source: Statcounter Global Stats, ${data.sourceUrl}\r\n# License: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/\r\n# Retrieved: ${data.fetchedAt}\r\n`;
    download(new Blob(['\uFEFF', metadata, csvExport(data, months)], { type: 'text/csv;charset=utf-8' }), `global-signals-${data.metric}-${data.region}-${latestMonth}.csv`);
    setNotice('Data exported to CSV.');
  }
  function exportPng() {
    const canvas = document.getElementById('market-chart') as HTMLCanvasElement | null;
    if (!canvas || canvas.dataset.ready !== 'true') { setNotice('Please wait for the chart to finish loading.'); return; }
    const image = document.createElement('canvas');
    image.width = canvas.width;
    const ctx = image.getContext('2d'); if (!ctx) return;
    const wrap = (text: string) => {
      const lines: string[] = []; let line = '';
      for (const word of text.split(' ')) {
        if (line && ctx.measureText(`${line} ${word}`).width > image.width - 40) { lines.push(line); line = word; }
        else line = line ? `${line} ${word}` : word;
      }
      if (line) lines.push(line);
      return lines;
    };
    ctx.font = 'bold 20px system-ui';
    const title = wrap(`${metrics[data.metric].label} · ${regions[data.region]} · ${devices[data.device]} · ${mode === 'bar' ? monthLabel(latestMonth) : `${monthLabel(historyDates[0])} – ${monthLabel(latestMonth)}`}`);
    ctx.font = '12px system-ui';
    const attribution = wrap('Source: Statcounter Global Stats (gs.statcounter.com) · CC BY-SA 3.0 · Chart: TeeChart JS');
    const legend = top.map((s, index) => ({ ...s, color: seriesColor(s.name, index) })).filter(s => !hidden.includes(s.name));
    const legendItems: { name: string; color: string; x: number; row: number }[] = [];
    let x = 20, row = 0;
    for (const s of legend) {
      const width = ctx.measureText(s.name).width + 30;
      if (x > 20 && x + width > image.width - 20) { x = 20; row++; }
      legendItems.push({ name: s.name, color: s.color, x, row }); x += width;
    }
    const headerHeight = 26 + title.length * 25;
    image.height = headerHeight + canvas.height + 30 + (row + 1) * 20 + attribution.length * 18;
    // Changing canvas dimensions resets its drawing context.
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, image.width, image.height);
    ctx.fillStyle = '#15233d'; ctx.font = 'bold 20px system-ui';
    title.forEach((line, i) => ctx.fillText(line, 20, 30 + i * 25));
    ctx.drawImage(canvas, 0, headerHeight);
    ctx.font = '12px system-ui';
    const footerY = headerHeight + canvas.height + 18;
    for (const s of legendItems) {
      const y = footerY + s.row * 20;
      ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x + 3, y - 4, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#61718b'; ctx.fillText(s.name, s.x + 12, y);
    }
    ctx.fillStyle = '#61718b';
    attribution.forEach((line, i) => ctx.fillText(line, 20, footerY + (row + 1) * 20 + 7 + i * 18));
    image.toBlob(blob => { if (blob) { download(blob, `global-signals-${data.metric}-${mode}.png`); setNotice('Chart exported to PNG.'); } });
  }

  return <div class="app-shell">
    {menu && <button class="sidebar-scrim" aria-label="Close menu" onClick={() => setMenu(false)} />}
    <aside class={`sidebar ${menu ? 'is-open' : ''}`}>
      <a class="logo" href="/" aria-label="Global Signals, home"><span class="logo-symbol"><BarChart3 size={23} strokeWidth={2.5} /></span><span>global<span class="logo-light">signals</span><small>THE WEB, IN NUMBERS</small></span></a>
      <button class="mobile-close icon-button" aria-label="Close menu" onClick={() => setMenu(false)}><X size={20} /></button>
      <div class="sidebar-label">EXPLORE</div>
      <nav class="main-nav" aria-label="Statistics">
        {(Object.keys(metrics) as Metric[]).map(key => { const Icon = metricIcons[key]; return <button class={query.metric === key ? 'active' : ''} onClick={() => selectMetric(key)} aria-current={query.metric === key ? 'page' : undefined} key={key}><Icon size={19} /><span>{metrics[key].label}</span>{query.metric === key && <span class="active-dot" />}</button>; })}
      </nav>
      <div class="nav-divider" />
      <div class="sidebar-label">RESOURCES</div>
      <nav class="main-nav resource-nav" aria-label="Resources"><button onClick={() => setMethodology(true)}><CircleHelp size={19} />Methodology</button><a href="https://gs.statcounter.com/" target="_blank" rel="noreferrer"><ExternalLink size={18} />Data source<ArrowUpRight size={14} class="external-arrow" /></a></nav>
      <div class="sidebar-bottom"><div class="sidebar-note"><span class="note-icon"><Sparkles size={19} /></span><h3>A fresh perspective.</h3><p>Trusted data.<br />A better way to explore it.</p><button onClick={() => setMethodology(true)}>About this project <ArrowRight size={15} /></button></div></div>
    </aside>

    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb"><button class="mobile-menu icon-button" aria-label="Open menu" onClick={() => setMenu(true)}><Menu size={21} /></button><LayoutGrid size={16} /><span>Overview</span><ChevronRight size={14} /><strong>{metrics[query.metric].label}</strong></div>
        <div class="topbar-right"><span class="demo-badge">DEMO</span><button class="icon-button theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span class="theme-icon"><Sun class="sun-icon" size={17} /><Moon class="moon-icon" size={17} /></span></button><button class="text-button" onClick={() => setMethodology(true)}>About the data <Info size={15} /></button></div>
      </header>

      <main id="main-content">
        <section class="page-intro"><div><div class="eyebrow"><span /> A GLOBAL POINT OF VIEW</div><h1>The digital world, <span>in perspective.</span></h1><p>{metrics[query.metric].description}</p></div><div class="intro-meta"><span class="live-pill"><span class="live-dot" /> Real data from StatCounter</span><span class="intro-month">Monthly update <span>·</span> {monthLabel(latestMonth)}</span></div></section>

        <section class="filter-panel" aria-label="Data filters">
          <div class="filter-field"><label for="region"><Globe2 size={15} />Region</label><div class="select-wrap"><select id="region" value={query.region} onChange={e => setQuery(q => ({ ...q, region: e.currentTarget.value as Region }))}>{Object.entries(regions).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={15} /></div></div>
          <div class="filter-field"><label for="device"><Laptop size={15} />Device</label><div class="select-wrap"><select id="device" value={query.device} disabled={query.metric === 'platform'} onChange={e => setQuery(q => ({ ...q, device: e.currentTarget.value as Device }))}>{Object.entries(devices).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={15} /></div></div>
          <div class="filter-field"><label for="period"><SlidersHorizontal size={15} />Period</label><div class="select-wrap"><select id="period" value={months} onChange={e => setMonths(Number(e.currentTarget.value))}><option value="6">Last 6 months</option><option value="12">Last 12 months</option><option value="24">Last 24 months</option></select><ChevronDown size={15} /></div></div>
          <div class="filter-actions"><button class={`icon-button ${loading ? 'spinning' : ''}`} disabled={loading} onClick={refreshData} title="Refresh data" aria-label="Refresh data"><RefreshCw size={17} /></button><button class="button secondary share-button" onClick={share}><Copy size={15} /><span>Share view</span></button></div>
        </section>

        {error && <div class="status-message error" role="alert"><Info size={18} /><span>{error} Showing the last loaded data ({metrics[data.metric].label}, {regions[data.region]}).</span><button onClick={refreshData}>Retry</button></div>}
        {data.stale && !error && <div class="status-message" role="status"><Info size={18} /><span>The source is unavailable. Showing a real snapshot saved on {new Date(data.fetchedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}.</span><button onClick={refreshData}>Retry</button></div>}

        <div class={`analytics ${loading && queryKey(query) !== queryKey(data) ? 'is-loading' : ''}`} aria-busy={loading}>
          <div class="section-heading"><h2>{metrics[data.metric].label}<span class="heading-divider" /> <span>{regions[data.region]}</span></h2><span class="period-note">{monthLabel(latestMonth)} <span class="dot-separator">·</span> vs. previous month</span></div>
          <section class="kpi-grid" aria-label="Leading market shares">
            {top.slice(0, 4).map((s, index) => <article class="kpi-card" key={s.name}><div class="kpi-top"><div><BrandMark name={s.name} color={seriesColor(s.name, index)} /><h3>{s.name}</h3></div><span class="rank-badge">0{index + 1}</span></div><div class="kpi-value">{percent(s.values[last])}<span>%</span></div><div class="kpi-bottom"><Change value={s.values[last] - s.values[last - 1]} /><span>vs. {monthLabel(previousMonth, true)}</span></div><div class="kpi-meter"><span style={{ width: `${s.values[last]}%`, background: seriesColor(s.name, index) }} /></div></article>)}
          </section>

          <section class="chart-panel panel" aria-labelledby="chart-title"><div class="panel-header"><div><div class="panel-title-row"><h2 id="chart-title">{mode === 'line' ? 'Market share over time' : 'A snapshot of today'}</h2><span class="subtle-badge">{mode === 'line' ? 'MONTHLY' : 'LATEST MONTH'}</span></div><p>{mode === 'line' ? `${monthLabel(historyDates[0])} — ${monthLabel(latestMonth)}` : monthLabel(latestMonth)} <span>·</span> {devices[data.device]}</p></div><div class="chart-actions"><div class="segmented-control" aria-label="Chart type"><button class={mode === 'line' ? 'selected' : ''} onClick={() => setMode('line')} aria-pressed={mode === 'line'}><LineChart size={15} /><span>Trends</span></button><button class={mode === 'bar' ? 'selected' : ''} onClick={() => setMode('bar')} aria-pressed={mode === 'bar'}><BarChart3 size={15} /><span>Comparison</span></button></div><button class="icon-button chart-export" onClick={exportPng} title="Download chart as PNG" aria-label="Download chart as PNG"><ArrowDownToLine size={18} /></button></div></div>
            <div class="chart-unit">MARKET SHARE (%)</div>
            <TeeChart data={data} months={months} hidden={hidden} mode={mode} dark={theme === 'dark'} />
            <div class="chart-legend" aria-label="Visible series">{top.map((s, i) => <button key={s.name} class={hidden.includes(s.name) ? 'muted' : ''} aria-pressed={!hidden.includes(s.name)} onClick={() => toggleSeries(s.name)}><span class="series-dot" style={{ background: seriesColor(s.name, i) }} />{s.name}<span class="legend-value">{percent(s.values[last])}%</span></button>)}</div>
            <div class="chart-footer"><span><Info size={13} /> Click a legend item to show or hide a series.</span><span>Charts by <a href="https://github.com/Steema/TeeChartJS" target="_blank" rel="noreferrer">TeeChart JS <ArrowUpRight size={12} /></a></span></div>
          </section>

          <section class="insights-strip" aria-label="Quick insights"><div class="insights-label"><Sparkles size={17} /><span>At a glance</span></div><p><strong>{lead.name}</strong> leads with a <b>{percent(lead.values[last])}%</b> share.</p><span class="insights-divider" /><p><span class="insight-up"><ArrowUpRight size={15} /></span><strong>{winner.name}</strong> has the biggest gain: <b>+{percent(winner.values[last] - winner.values[last - 1])} pp</b> this month.</p></section>

          <section class="table-panel panel" aria-labelledby="table-title"><div class="panel-header"><div><h2 id="table-title">A closer look at the data</h2><p>{regions[data.region]} <span>·</span> {metrics[data.metric].label} <span>·</span> {tableMode === 'latest' ? monthLabel(latestMonth) : `${historyDates.length} months`}</p></div><button class="button secondary" onClick={exportCsv}><ArrowDownToLine size={16} />Export CSV</button></div><div class="table-toolbar"><div class="table-tabs"><button class={tableMode === 'latest' ? 'active' : ''} onClick={() => setTableMode('latest')} aria-pressed={tableMode === 'latest'}>Latest month</button><button class={tableMode === 'history' ? 'active' : ''} onClick={() => setTableMode('history')} aria-pressed={tableMode === 'history'}>Monthly history</button></div><label class="table-search"><Search size={15} /><input type="search" value={searchTerm} onInput={e => setSearchTerm(e.currentTarget.value)} placeholder="Search the data…" aria-label="Search the data" /></label></div>
            <div class="table-scroll" tabIndex={0} aria-label="Market share table"><table><thead><tr><th class="rank-column">#</th><th>{metrics[data.metric].singular}</th>{tableMode === 'latest' ? <><th>Market share <ChevronDown size={13} /></th><th>Previous month</th><th>Monthly change</th><th class="distribution-column">Distribution</th></> : historyDates.map(d => <th key={d}>{monthLabel(d)}</th>)}</tr></thead><tbody>{visibleRows.map(s => { const i = data.series.indexOf(s); const color = seriesColor(s.name, i); return <tr key={s.name}><td class="rank-column">{String(i + 1).padStart(2, '0')}</td><th scope="row"><BrandMark small name={s.name} color={color} />{s.name}</th>{tableMode === 'latest' ? <><td class="table-value">{percent(s.values[last])}<span>%</span></td><td class="previous-value">{percent(s.values[last - 1])}%</td><td><Change value={s.values[last] - s.values[last - 1]} /></td><td class="distribution-column"><div class="table-meter"><span style={{ width: `${s.values[last]}%`, background: color }} /></div></td></> : s.values.slice(-months).map((value, index) => <td class="history-value" key={index}>{percent(value)}%</td>)}</tr>; })}</tbody></table>{visibleRows.length === 0 && <div class="empty-state">No results for “{searchTerm}”.</div>}</div><div class="table-footer"><span>{visibleRows.length} of {data.series.length} categories <span>·</span> Changes are shown in percentage points (pp).</span><a href={data.sourceUrl} target="_blank" rel="noreferrer">Original CSV <ArrowUpRight size={13} /></a></div>
          </section>
        </div>

        <footer class="page-footer"><div><a href="https://gs.statcounter.com/" target="_blank" rel="noreferrer">Statcounter Global Stats</a><span>·</span><a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a><p>Web usage share, not user counts. Data may be revised for 45 days after publication.</p></div><nav class="footer-links" aria-label="Project links"><a class="original-link" href={source} target="_blank" rel="noreferrer">Explore the original data <ArrowUpRight size={15} /></a><a class="source-link" href="https://github.com/YerayAlonso/global-signals" target="_blank" rel="noreferrer">Source on GitHub <ExternalLink size={14} /></a></nav></footer>
      </main>
    </div>
    {notice && <div class="toast" role="status"><Check size={17} />{notice}</div>}
    {methodology && <dialog id="methodology-dialog" class="methodology-dialog" onCancel={() => setMethodology(false)} onClick={e => { if (e.target === e.currentTarget) { const rect = e.currentTarget.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) setMethodology(false); } }}><div class="dialog-header"><span class="note-icon"><Info size={22} /></span><button class="icon-button" aria-label="Close" onClick={() => setMethodology(false)}><X size={20} /></button></div><div class="eyebrow">DATA WITH CONTEXT</div><h2>A clearer perspective.</h2><p>Global Signals is an independent demo that brings a modern experience to Statcounter Global Stats.</p><h3>What are you looking at?</h3><p>Usage shares based on page views across the StatCounter network. Search engines are measured by the traffic they refer to these sites, not the number of searches. These figures are not sales shares or user counts.</p><h3>Real data, fast loading</h3><p>We use StatCounter’s public CSV export, cached for up to 6 hours on Vercel. We show up to 24 complete months. If the source is unavailable, saved snapshots are clearly labelled. The source publishes data daily and may revise it for 45 days.</p><h3>Just the right technology</h3><p>Astro serves the static page; Preact handles the interactions and TeeChart JS draws the charts. No account, API key or database needed.</p><a class="button primary" href="https://gs.statcounter.com/faq#methodology" target="_blank" rel="noreferrer">Read StatCounter’s methodology <ArrowUpRight size={16} /></a><p class="dialog-license">Data: <a href="https://gs.statcounter.com/" target="_blank" rel="noreferrer">Statcounter Global Stats</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA 3.0</a>. Chart library: TeeChart JS, MIT.</p></dialog>}
  </div>;
}
