import { Compass, Flame, Globe2 } from 'lucide-preact';
export default function BrandMark({ name, color, small = false }: { name: string; color: string; small?: boolean }) {
  return <span class={`brand-mark ${small ? 'small' : ''}`} style={{ '--brand': color }} aria-hidden="true">
    {name === 'Chrome' ? <svg width={small ? 17 : 23} height={small ? 17 : 23} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9.5" /><circle cx="12" cy="12" r="4" /><path d="M12 8h8.5M8.5 14 4 6.5M14 15.5l-4 6" /></svg> : name === 'Safari' ? <Compass size={small ? 17 : 23} /> : name === 'Firefox' ? <Flame size={small ? 17 : 23} /> : name === 'Edge' ? <span class="edge-letter">e</span> : name.length <= 3 ? <b>{name.slice(0, 2)}</b> : <Globe2 size={small ? 17 : 23} />}
  </span>;
}
