/* global React */
// Hi-fi animated chart primitives. Accent comes from CSS var --acc.
const { useState, useEffect, useRef, useId } = React;

const COL = { ok: 'var(--acc)', warn: 'var(--warn)', danger: 'var(--danger)' };

function useMount(delay = 60) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return on;
}

// animated number count-up
function Count({ value, format, dur = 900, className, style }) {
  const [v, setV] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = value;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(a + (b - a) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    // fallback: if rAF is throttled/never fires, snap to final value
    const safety = setTimeout(() => { setV(b); from.current = b; }, dur + 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [value, dur]);
  return <span className={className} style={style}>{format ? format(v) : Math.round(v)}</span>;
}

// Big progress ring with gradient + glow
function Ring({ size = 200, stroke = 16, ratio = 0.6, status = 'ok', children }) {
  const on = useMount(120);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const shown = on ? Math.min(ratio, 1) : 0;
  const col = COL[status];
  const gid = useId().replace(/:/g, '');
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <defs>
          <linearGradient id={'rg' + gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.65" />
            <stop offset="100%" stopColor={col} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, var(--text) 11%, transparent)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#rg${gid})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: 'stroke-dashoffset 1.3s cubic-bezier(.22,.9,.27,1)', filter: `drop-shadow(0 0 6px color-mix(in oklab, ${col} 55%, transparent))` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  );
}

// Area + line chart (animated draw)
function LineChart({ data, height = 150, status = 'ok', months }) {
  const on = useMount(200);
  const pad = 6;
  const W = 600;
  const H = height;
  const max = Math.max(...data) * 1.18 || 1;
  const min = Math.min(...data) * 0.6;
  const span = max - min || 1;
  const sx = W / (data.length - 1);
  const pts = data.map((d, i) => [i * sx, H - pad - ((d - min) / span) * (H - pad * 2)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${W} ${H} L0 ${H} Z`;
  const col = COL[status];
  const gid = useId().replace(/:/g, '');
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => { if (ref.current) setLen(ref.current.getTotalLength()); }, [data]);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={'la' + gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity="0.32" />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.5, 1].map((g, i) => <line key={i} x1="0" x2={W} y1={H * (g === 1 ? 0.5 : 0.16)} y2={H * (g === 1 ? 0.5 : 0.16)} stroke="var(--line)" strokeWidth="1" />)}
        <path d={area} fill={`url(#la${gid})`} style={{ opacity: on ? 1 : 0, transition: 'opacity .9s ease .4s' }} />
        <path ref={ref} d={path} fill="none" stroke={col} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={len} strokeDashoffset={on ? 0 : len}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,.8,.3,1)' }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4.5 : 0} fill="var(--surface)" stroke={col} strokeWidth="2.6"
            style={{ opacity: on ? 1 : 0, transition: `opacity .4s ease ${0.9 + i * 0.05}s` }} />
        ))}
      </svg>
      {months && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5 }} className="faint tnum">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>}
    </div>
  );
}

// Bar chart (animated grow), highlights last bar
function BarChart({ data, height = 130, months, status = 'ok' }) {
  const on = useMount(160);
  const max = Math.max(...data) * 1.15 || 1;
  const col = COL[status];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <div key={i} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              <div style={{
                width: '100%', height: on ? `${(d / max) * 100}%` : '0%', borderRadius: '7px 7px 4px 4px',
                background: last ? `linear-gradient(180deg, ${col}, color-mix(in oklab, ${col} 60%, var(--surface-3)))` : 'var(--surface-3)',
                border: last ? 'none' : '1px solid var(--line)',
                boxShadow: last ? `0 0 16px -4px ${col}` : 'none',
                transition: `height .9s cubic-bezier(.22,.9,.27,1) ${i * 0.06}s`,
              }} />
            </div>
          );
        })}
      </div>
      {months && <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        {months.map((m, i) => <div key={m} style={{ flex: 1, textAlign: 'center', fontSize: 11.5, fontWeight: i === months.length - 1 ? 700 : 400 }} className={i === months.length - 1 ? '' : 'faint'}>{m}</div>)}
      </div>}
    </div>
  );
}

// Donut split by category
function Donut({ size = 168, stroke = 24, segs }) {
  const on = useMount(140);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const total = segs.reduce((s, x) => s + x.value, 0) || 1;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="color-mix(in oklab, var(--text) 9%, transparent)" strokeWidth={stroke} />
      {segs.map((s, i) => {
        const frac = s.value / total;
        const len = (on ? frac : 0) * c;
        const off = -acc * c;
        acc += frac;
        return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
          strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off}
          style={{ transition: `stroke-dasharray 1s cubic-bezier(.22,.9,.27,1) ${i * 0.08}s` }} />;
      })}
    </svg>
  );
}

Object.assign(window, { Ring, LineChart, BarChart, Donut, Count, useMount, COL });
