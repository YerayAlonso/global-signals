import { fetchStats } from '../src/lib/statcounter';
import { type Query } from '../src/lib/model';
const queries: Query[] = [
  { metric: 'browser', region: 'ww', device: 'all' },
  { metric: 'os', region: 'ww', device: 'all' },
  { metric: 'search', region: 'ww', device: 'all' },
  { metric: 'platform', region: 'ww', device: 'all' },
  { metric: 'browser', region: 'ES', device: 'mobile' },
  { metric: 'search', region: 'eu', device: 'desktop' },
];
// Sequential requests keep the demo's upstream footprint small.
for (const query of queries) {
  const start = performance.now();
  const data = await fetchStats(query);
  console.log(`${query.metric}/${query.region}/${query.device}: ${data.dates.length} months through ${data.dates.at(-1)}, leader ${data.series[0].name} (${data.series[0].values.at(-1)}%), ${Math.round(performance.now() - start)} ms`);
}
