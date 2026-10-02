import { describe, expect, it } from 'vitest';
import { dateRange, normalizeCsv, parseCsv, sourceUrl } from '../../src/lib/statcounter';
import { csvExport, defaultQuery, parseQuery, type Dataset } from '../../src/lib/model';
const now = new Date('2026-10-02T09:00:00Z');
const csv = '"Date","Chrome","Safari"\r\n2026-08,69.28,30.72\r\n2026-09,66.45,33.55\r\n';

describe('StatCounter data boundary', () => {
  it('reads quoted fields, escaped quotes, BOM, CRLF and embedded newlines', () => {
    expect(parseCsv('\uFEFF"Name","Value"\r\n"A, B","say ""hi""\nnow"\r\n')).toEqual([['Name', 'Value'], ['A, B', 'say "hi"\nnow']]);
    expect(() => parseCsv('"unfinished')).toThrow('Incomplete CSV');
  });
  it('requests 24 closed months across year boundaries, never a partial current month', () => {
    expect(dateRange(now)).toEqual({ start: '2024-10', end: '2026-09' });
    expect(dateRange(new Date('2026-01-01T00:01:00Z'))).toEqual({ start: '2024-01', end: '2025-12' });
    const url = new URL(sourceUrl({ metric: 'platform', region: 'ES', device: 'all' }, now));
    expect(url.searchParams.get('statType_hidden')).toBe('comparison');
    expect(url.searchParams.get('device_hidden')).toBe('desktop+mobile+tablet+console');
    expect(url.searchParams.get('region_hidden')).toBe('ES');
    expect(url.searchParams.get('toInt')).toBe('202609');
  });
  it('normalizes real-style CSV and ranks by the latest month', () => {
    const result = normalizeCsv(csv, defaultQuery, 'https://gs.statcounter.com/chart.php', now);
    expect(result.dates).toEqual(['2026-08', '2026-09']);
    expect(result.series[0]).toEqual({ name: 'Chrome', values: [69.28, 66.45] });
    expect(result.fetchedAt).toBe(now.toISOString());
  });
  it.each([
    ['upstream HTML error', '<html>Error</html>'],
    ['empty values', csv.replace('66.45', '')],
    ['malformed numbers', csv.replace('66.45', 'NaN')],
    ['incomplete row', csv.replace(',33.55', '')],
    ['impossible share', csv.replace('66.45', '166.45')],
    ['incomplete distribution', csv.replace('66.45', '3')],
    ['out-of-range date', csv.replace('2026-09', '2026-10')],
    ['duplicate month', csv.replace('2026-09', '2026-08')],
  ])('rejects %s instead of presenting corrupt data', (_, value) => {
    expect(() => normalizeCsv(value, defaultQuery, 'source', now)).toThrow();
  });
  it('rejects unknown filters and canonicalizes the device comparison query', () => {
    expect(() => parseQuery(new URLSearchParams('region=invalid'))).toThrow();
    expect(parseQuery(new URLSearchParams('metric=platform&device=mobile'))).toEqual({ metric: 'platform', region: 'ww', device: 'all' });
  });
  it('exports the requested tail of the original series without aggregating percentages', () => {
    const data = normalizeCsv(csv, defaultQuery, 'source', now) as Dataset;
    expect(csvExport(data, 1)).toBe('"Date","Chrome","Safari"\r\n2026-09,66.45,33.55');
    expect(csvExport(data, 24).split('\r\n')).toHaveLength(3);
  });
});
