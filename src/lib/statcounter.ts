import { metrics, type Dataset, type Query } from './model';

/** RFC4180-style quoted fields, including commas, escaped quotes and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); if (row.some(v => v.trim())) rows.push(row);
      row = []; field = '';
    } else field += c;
  }
  if (quoted) throw new Error('Incomplete CSV.');
  row.push(field); if (row.some(v => v.trim())) rows.push(row);
  return rows;
}
export function dateRange(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 23, 1));
  return { start: start.toISOString().slice(0, 7), end: end.toISOString().slice(0, 7) };
}
export function sourceUrl(query: Query, now = new Date()) {
  const { start, end } = dateRange(now);
  const device = query.device === 'all' ? 'desktop+mobile+tablet+console' : query.device;
  const params = new URLSearchParams({
    device_hidden: device, statType_hidden: metrics[query.metric].stat,
    region_hidden: query.region, granularity: 'monthly',
    fromInt: start.replace('-', ''), toInt: end.replace('-', ''),
    fromMonthYear: start, toMonthYear: end, csv: '1',
  });
  return `https://gs.statcounter.com/chart.php?${params}`;
}
export function normalizeCsv(text: string, query: Query, url: string, now = new Date()): Dataset {
  const [header, ...rows] = parseCsv(text);
  if (!header || header[0] !== 'Date' || header.length < 2 || rows.length < 2 || rows.length > 24) throw new Error('Unexpected data format.');
  const { start, end } = dateRange(now);
  for (const [i, row] of rows.entries()) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row[0]) || row[0] < start || row[0] > end || row.length !== header.length || (i > 0 && row[0] <= rows[i - 1][0])) throw new Error('Invalid data period.');
    for (const value of row.slice(1)) {
      if (value.trim() === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) throw new Error('Invalid market share value.');
    }
    const total = row.slice(1).reduce((sum, v) => sum + Number(v), 0);
    if (Math.abs(total - 100) > 2) throw new Error('Incomplete data.');
  }
  const series = header.slice(1).map((name, i) => ({ name, values: rows.map(row => Number(row[i + 1])) }));
  series.sort((a, b) => b.values.at(-1)! - a.values.at(-1)!);
  return { ...query, dates: rows.map(row => row[0]), series, fetchedAt: now.toISOString(), sourceUrl: url };
}
export async function fetchStats(query: Query): Promise<Dataset> {
  const now = new Date();
  const url = sourceUrl(query, now);
  const response = await fetch(url, { signal: AbortSignal.timeout(12000), headers: { Accept: 'text/csv', 'User-Agent': 'GlobalSignalsDemo/1.0 (Statcounter data visualization)' } });
  if (!response.ok) throw new Error(`StatCounter: ${response.status}`);
  const text = await response.text();
  if (text.length > 500_000) throw new Error('Response too large.');
  return normalizeCsv(text, query, url, now);
}
