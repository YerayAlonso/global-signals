import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { APIContext } from 'astro';
const csv = '"Date","Chrome","Safari"\n2026-08,69.28,30.72\n2026-09,66.45,33.55\n';
async function request(params = '') {
  const { GET } = await import('../../src/pages/api/stats');
  return GET({ url: new URL(`https://demo.example/api/stats?${params}`) } as APIContext);
}
describe('cached data endpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-02T09:00:00Z'));
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => new Response(csv)));
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('rejects unknown filters before contacting upstream', async () => {
    expect((await request('metric=unknown')).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('deduplicates concurrent requests and serves the fresh result from cache', async () => {
    const [a, b] = await Promise.all([request(), request()]);
    expect(await a.json()).toEqual(await b.json());
    await request();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(a.headers.get('Cache-Control')).toBe('public, max-age=300');
  });
  it('revalidates expired entries and explicitly labels a last-good fallback', async () => {
    const a = await request('region=ES');
    const original = await a.json();
    vi.advanceTimersByTime(7 * 60 * 60 * 1000);
    vi.mocked(fetch).mockRejectedValue(new Error('Upstream unavailable'));
    const fallback = await request('region=ES');
    expect(await fallback.json()).toEqual({ ...original, stale: true });
    expect(fallback.headers.get('Cache-Control')).toBe('no-store');
  });
  it('uses the bundled snapshot only for its exact scope', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Offline'));
    expect((await (await request()).json()).stale).toBe(true);
    expect((await request('region=ES')).status).toBe(502);
    expect((await request('metric=os')).status).toBe(502);
  });
  it('does not cache malformed upstream responses', async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response('<html>Rate limited</html>'));
    expect((await request('region=ES')).status).toBe(502);
    expect((await request('region=ES')).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
