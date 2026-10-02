export const metrics = {
  browser: { label: 'Browsers', singular: 'Browser', title: 'A window into the digital world.', description: 'Discover the browsers the world uses to explore the web.', source: 'browser-market-share', stat: 'browser' },
  os: { label: 'Operating systems', singular: 'Operating system', title: 'Behind every connected device.', description: 'Explore the operating systems that keep the world connected.', source: 'os-market-share', stat: 'os' },
  search: { label: 'Search engines', singular: 'Search engine', title: 'Where every discovery begins.', description: 'Follow the share of web traffic referred by search engines.', source: 'search-engine-market-share', stat: 'search_engine' },
  platform: { label: 'Devices', singular: 'Device', title: 'One world, many screens.', description: 'Compare web usage across mobile, desktop, tablet and console.', source: 'platform-market-share/desktop-mobile-tablet-console', stat: 'comparison' },
} as const;
export const regions = { ww: 'Worldwide', eu: 'Europe', na: 'North America', sa: 'South America', as: 'Asia', af: 'Africa', oc: 'Oceania', ES: 'Spain', US: 'United States', GB: 'United Kingdom', FR: 'France', DE: 'Germany', IN: 'India', JP: 'Japan', BR: 'Brazil' } as const;
export const devices = { all: 'All devices', desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' } as const;
export type Metric = keyof typeof metrics;
export type Region = keyof typeof regions;
export type Device = keyof typeof devices;
export type Query = { metric: Metric; region: Region; device: Device };
export type Dataset = Query & { dates: string[]; series: { name: string; values: number[] }[]; fetchedAt: string; sourceUrl: string; stale?: boolean };
export const defaultQuery: Query = { metric: 'browser', region: 'ww', device: 'all' };
export const queryKey = (q: Query) => `${q.metric}:${q.region}:${q.device}`;
export function parseQuery(params: URLSearchParams): Query {
  const metric = params.get('metric') ?? 'browser';
  const region = params.get('region') ?? 'ww';
  const device = params.get('device') ?? 'all';
  if (!Object.hasOwn(metrics, metric) || !Object.hasOwn(regions, region) || !Object.hasOwn(devices, device)) throw new Error('Invalid filters.');
  return { metric, region, device: metric === 'platform' ? 'all' : device } as Query;
}
export function monthLabel(month: string, short = false) {
  return new Intl.DateTimeFormat('en-US', { month: short ? 'short' : 'long', ...(short ? {} : { year: 'numeric' }), timeZone: 'UTC' }).format(new Date(`${month}-01T00:00:00Z`));
}
export const percent = (value: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
export const palette = ['#2563eb', '#8b5cf6', '#0ba98a', '#f59e0b', '#ec4899', '#62748e', '#06b6d4', '#a3a3a3'];
const brandColors: Record<string, string> = { Chrome: '#2563eb', Safari: '#8b5cf6', Edge: '#0ba98a', Firefox: '#f59e0b', 'Samsung Internet': '#ec4899', Opera: '#62748e' };
export const seriesColor = (name: string, index: number) => brandColors[name] ?? palette[index % palette.length];
export function csvExport(data: Dataset, count: number) {
  const quote = (s: string) => `"${s.replaceAll('"', '""')}"`;
  return [ ['Date', ...data.series.map(s => s.name)].map(quote).join(','), ...data.dates.slice(-count).map((date, i) => [date, ...data.series.map(s => s.values[data.dates.length - Math.min(count, data.dates.length) + i])].join(',')) ].join('\r\n');
}
