import type { APIRoute } from 'astro';
import { parseQuery, queryKey, type Dataset } from '../../lib/model';
import { dateRange, fetchStats } from '../../lib/statcounter';
import snapshot from '../../data/snapshot.json';

export const prerender = false;
const cache = new Map<string, { data: Dataset; expires: number }>();
const inflight = new Map<string, Promise<Dataset>>();
const json = (data: unknown, status = 200, cached = false) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cached ? 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400' : 'no-store',
    'X-Content-Type-Options': 'nosniff',
  },
});
export const GET: APIRoute = async ({ url }) => {
  let query;
  try { query = parseQuery(url.searchParams); }
  catch { return json({ error: 'Invalid filters.' }, 400); }
  const key = `${queryKey(query)}:${dateRange().end}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return json(hit.data, 200, true);
  try {
    let promise = inflight.get(key);
    if (!promise) {
      promise = fetchStats(query);
      inflight.set(key, promise);
    }
    const data = await promise;
    if (cache.size >= 128) cache.delete(cache.keys().next().value!);
    cache.set(key, { data, expires: Date.now() + 6 * 60 * 60 * 1000 });
    return json(data, 200, true);
  } catch (error) {
    console.error('StatCounter fetch failed:', error instanceof Error ? error.message : error);
    const fallback = hit?.data ?? (queryKey(query) === queryKey(snapshot as Dataset) ? snapshot : null);
    if (fallback) return json({ ...fallback, stale: true });
    return json({ error: 'StatCounter is not responding. Please try again in a moment.' }, 502);
  } finally { inflight.delete(key); }
};
