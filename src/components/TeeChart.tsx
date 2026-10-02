import { useEffect, useRef, useState } from 'preact/hooks';
import { loadTeeChart, type Chart } from '../lib/teechart';
import { monthLabel, percent, seriesColor, type Dataset } from '../lib/model';

type Props = { data: Dataset; months: number; hidden: string[]; mode: 'line' | 'bar'; dark: boolean };
export default function TeeChart({ data, months, hidden, mode, dark }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chart = useRef<Chart | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null);
  const [retry, setRetry] = useState(0);
  const dates = data.dates.slice(-months);
  const selected = data.series.slice(0, 6).map((s, index) => ({ ...s, color: seriesColor(s.name, index) })).filter(s => !hidden.includes(s.name));

  useEffect(() => {
    let disposed = false;
    let observer: ResizeObserver | undefined;
    setReady(false); setError(''); setHover(null);
    loadTeeChart().then(Tee => {
      if (disposed || !canvas.current || !host.current) return;
      const c = canvas.current;
      const instance = new Tee.Chart(c);
      chart.current = instance;
      instance.title.visible = false;
      instance.footer.visible = false;
      instance.legend.visible = false;
      instance.walls.visible = false;
      instance.zoom.enabled = false;
      instance.scroll.enabled = false;
      instance.panel.format.fill = dark ? '#111b2c' : '#ffffff';
      instance.panel.format.gradient.visible = false;
      instance.panel.format.shadow.visible = false;
      instance.panel.format.stroke.fill = '';
      for (const axis of Object.values(instance.axes).filter(a => a && typeof a.setMinMax === 'function')) {
        axis.labels.format.font.style = '11px system-ui';
        axis.labels.format.font.fill = dark ? '#8b9bb3' : '#8491a5';
        axis.labels.decimals = 0;
        axis.title.text = '';
        axis.ticks.visible = false;
        axis.minorTicks.visible = false;
        axis.format.stroke.fill = '';
        axis.grid.visible = false;
      }
      instance.axes.top.visible = false;
      instance.axes.right.visible = false;
      instance.axes.left.grid.visible = true;
      instance.axes.left.grid.format.stroke.fill = dark ? '#26344a' : '#edf0f5';
      instance.axes.left.grid.format.stroke.size = 1;
      instance.axes.left.labels.ongetlabel = value => `${value}%`;
      const max = Math.max(1, ...selected.flatMap(s => mode === 'line' ? s.values.slice(-months) : [s.values.at(-1)!]));
      const ceiling = Math.min(100, Math.ceil(max / 20) * 20);
      instance.axes.left.setMinMax(0, ceiling);
      instance.axes.left.increment = ceiling / 4;
      if (mode === 'line') {
        instance.axes.bottom.setMinMax(0, dates.length - 1);
        instance.axes.bottom.labels.ongetlabel = value => dates[value] ? monthLabel(dates[value], true).replace('.', '') : '';
        selected.forEach(s => {
          const line = instance.addSeries(new Tee.Line());
          line.title = s.name;
          line.data.values = s.values.slice(-months);
          line.data.labels = dates.map(d => monthLabel(d, true));
          line.format.stroke.fill = s.color;
          line.format.stroke.size = 2.5;
          line.format.shadow.visible = false;
          line.pointer.visible = false;
          line.marks.visible = false;
          line.hover.enabled = false;
        });
      } else {
        const bar = instance.addSeries(new Tee.Bar());
        bar.data.values = selected.map(s => s.values.at(-1)!);
        bar.data.labels = selected.map(s => s.name === 'Samsung Internet' ? 'Samsung' : s.name);
        bar.colorEach = 'yes';
        bar.palette.colors = selected.map(s => s.color);
        bar.format.gradient.visible = false;
        bar.format.shadow.visible = false;
        bar.format.stroke.fill = '';
        bar.format.round.x = 5;
        bar.format.round.y = 5;
        bar.barSize = 45;
        bar.marks.visible = false;
        bar.hover.enabled = false;
        instance.axes.bottom.setMinMax(-0.5, selected.length - 0.5);
        instance.axes.bottom.increment = 1;
      }
      const resize = () => {
        if (disposed || !host.current) return;
        const { width, height } = host.current.getBoundingClientRect();
        if (!width || !height) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(width * ratio);
        c.height = Math.round(height * ratio);
        c.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
        instance.bounds.set(0, 0, width, height);
        instance.chartRect.automatic = false;
        instance.chartRect.set(44, 12, width - 60, height - 50);
        if (mode === 'line') instance.axes.bottom.increment = width < 500 ? Math.ceil(dates.length / 4) : Math.max(1, Math.ceil(dates.length / 12));
        instance.draw();
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(host.current);
      setReady(true);
    }).catch(err => { if (!disposed) setError(err instanceof Error ? err.message : 'Unable to render the chart.'); });
    return () => { disposed = true; observer?.disconnect(); chart.current = null; };
  }, [data, months, hidden, mode, dark, retry]);

  function point(clientX: number) {
    if (!chart.current || !canvas.current) return;
    const x = clientX - canvas.current.getBoundingClientRect().left;
    const count = mode === 'line' ? dates.length : selected.length;
    const index = Math.min(count - 1, Math.max(0, Math.round(chart.current.axes.bottom.fromPos(x))));
    setHover({ index, x: chart.current.axes.bottom.calc(index) });
  }
  const activeHover = hover && hover.index < (mode === 'line' ? dates.length : selected.length) ? hover : null;
  const tooltipRows = activeHover ? mode === 'line' ? selected.map(s => ({ name: s.name, color: s.color, value: s.values.slice(-months)[activeHover.index] })) : selected[activeHover.index] ? [{ name: selected[activeHover.index].name, color: selected[activeHover.index].color, value: selected[activeHover.index].values.at(-1)! }] : [] : [];
  return <div ref={host} class="chart-canvas-wrap" onPointerLeave={() => setHover(null)}>
    <canvas id="market-chart" ref={canvas} role="img" data-ready={ready && !error ? 'true' : 'false'} tabIndex={0} aria-label={`${mode === 'line' ? 'Monthly trends' : 'Latest market shares'} for ${selected.map(s => s.name).join(', ')}. Use the arrow keys to explore the data, or read the table below.`}
      onPointerMove={e => point(e.clientX)} onBlur={() => setHover(null)}
      onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'Escape'].includes(e.key)) return;
        e.preventDefault();
        if (e.key === 'Escape') { setHover(null); return; }
        const count = mode === 'line' ? dates.length : selected.length;
        const index = Math.min(count - 1, Math.max(0, (hover?.index ?? 0) + (e.key === 'ArrowRight' ? 1 : -1)));
        setHover({ index, x: chart.current?.axes.bottom.calc(index) ?? 0 });
      }} />
    {!ready && !error && <div class="chart-placeholder"><span class="loading-spinner" />Preparing your chart…</div>}
    {error && <div class="chart-placeholder" role="alert">{error}<button class="button secondary" onClick={() => setRetry(v => v + 1)}>Try again</button></div>}
    {activeHover && ready && <>
      {mode === 'line' && <div class="chart-crosshair" style={{ left: activeHover.x }} />}
      <div class="chart-tooltip" role="status" style={{ left: Math.max(0, Math.min(activeHover.x + 14, (host.current?.clientWidth ?? 400) - 210)) }}>
        <strong>{monthLabel(mode === 'line' ? dates[activeHover.index] : data.dates.at(-1)!)}</strong>
        {tooltipRows.map(s => <div key={s.name}><span class="series-dot" style={{ background: s.color }} /><span>{s.name}</span><b>{percent(s.value)}%</b></div>)}
      </div>
    </>}
  </div>;
}
