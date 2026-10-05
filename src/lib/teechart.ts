// TeeChart.js 4.0.5 is loaded as a self-hosted browser script. These types
// describe the small public API we use, outside the SSR module graph.
export interface Format {
  fill: string;
  stroke: { fill: string; size: number };
  gradient: { visible: boolean };
  shadow: { visible: boolean };
  font: { style: string; fill: string };
  round: { x: number; y: number };
}
interface Axis {
  visible: boolean;
  increment: number;
  labels: { format: Format; decimals: number; ongetlabel?: (value: number, text: string) => string };
  title: { text: string };
  grid: { visible: boolean; format: Format };
  ticks: { visible: boolean };
  minorTicks: { visible: boolean };
  format: Format;
  setMinMax: (min: number, max: number) => void;
  calc: (value: number) => number;
  fromPos: (value: number) => number;
}
interface Rect { x: number; y: number; width: number; height: number; automatic: boolean; set: (x: number, y: number, w: number, h: number) => void }
export interface Series {
  title: string;
  data: { values: number[]; labels: string[] };
  format: Format;
  hover: { enabled: boolean };
  marks: { visible: boolean };
  pointer: { visible: boolean; style: string; width: number; height: number; format: Format };
  colorEach: string;
  palette: { colors: string[] };
  barSize: number;
}
export interface Chart {
  bounds: Rect;
  chartRect: Rect;
  panel: { format: Format };
  title: { visible: boolean };
  footer: { visible: boolean };
  legend: { visible: boolean };
  walls: { visible: boolean };
  zoom: { enabled: boolean };
  scroll: { enabled: boolean };
  axes: { left: Axis; bottom: Axis; right: Axis; top: Axis };
  addSeries: (series: Series) => Series;
  draw: () => void;
}
interface TeeApi { Chart: new (canvas: HTMLCanvasElement) => Chart; Line: new () => Series; Bar: new () => Series }
declare global { interface Window { Tee?: TeeApi } }
let pending: Promise<TeeApi> | undefined;
export function loadTeeChart(): Promise<TeeApi> {
  if (window.Tee) return Promise.resolve(window.Tee);
  if (!pending) {
    pending = new Promise<TeeApi>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/teechart.js';
      script.async = true;
      script.onload = () => window.Tee ? resolve(window.Tee) : reject(new Error('TeeChart is unavailable.'));
      script.onerror = () => { script.remove(); reject(new Error('Unable to load TeeChart.')); };
      document.head.append(script);
    }).catch(error => { pending = undefined; throw error; });
  }
  return pending;
}
