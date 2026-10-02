import { mkdir, writeFile } from 'node:fs/promises';
import { fetchStats } from '../src/lib/statcounter';
import { defaultQuery } from '../src/lib/model';
const data = await fetchStats(defaultQuery);
await mkdir(new URL('../src/data/', import.meta.url), { recursive: true });
await writeFile(new URL('../src/data/snapshot.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
console.log(`Saved ${data.dates.length} months of real StatCounter data, through ${data.dates.at(-1)}.`);
