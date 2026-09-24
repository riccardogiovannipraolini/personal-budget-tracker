/* global React */
// Wireframe primitives — simple shapes only, hand-drawn vibe.
const { useId } = React;

const eur = (n) => '€' + (Math.round(n)).toLocaleString('it-IT');

// --- sketchy line/area "andamento" chart -------------------------------
function LineChart({ w = 360, h = 130, points, fill = true, accent = 'var(--wf-accent)' }) {
  const pts = points || [40, 55, 48, 70, 62, 88, 80, 104, 96];
  const max = Math.max(...pts) * 1.15;
  const stepX = w / (pts.length - 1);
  const coords = pts.map((p, i) => [i * stepX, h - (p / max) * h]);
  const line = coords.map((c, i) => (i ? 'L' : 'M') + c[0].toFixed(1) + ' ' + c[1].toFixed(1)).join(' ');
  const area = line + ` L${w} ${h} L0 ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--wf-line)" strokeWidth="1.4" strokeDasharray="5 6" />
      ))}
      {fill && <path d={area} fill={accent} opacity="0.13" />}
      <path d={line} fill="none" stroke={accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => <circle key={i} cx={c[0]} cy={c[1]} r="3.4" fill="var(--wf-paper)" stroke={accent} strokeWidth="2.4" />)}
    </svg>
  );
}

// --- mini bar chart (months) -------------------------------------------
function BarChart({ w = 360, h = 120, bars }) {
  const data = bars || [60, 72, 55, 80, 68, 92];
  const max = Math.max(...data) * 1.18;
  const gap = 12;
  const bw = (w - gap * (data.length - 1)) / data.length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d / max) * h;
        const last = i === data.length - 1;
        return <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh} rx="4"
          fill={last ? 'var(--wf-accent)' : 'var(--wf-fill-2)'} stroke="var(--wf-ink-soft)" strokeWidth="1.6" />;
      })}
    </svg>
  );
}

// --- donut / ring ------------------------------------------------------
function Ring({ size = 130, ratio = 0.62, status = 'ok', label, sub }) {
  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const col = status === 'danger' ? 'var(--wf-danger)' : status === 'warn' ? 'var(--wf-warn)' : 'var(--wf-accent)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--wf-fill-2)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c * Math.min(ratio, 1)} ${c}`} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', lineHeight: 1 }}>
        <div>
          <div className="wf-h2">{label}</div>
          {sub && <div className="wf-faint" style={{ fontSize: 13, marginTop: 4 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

// --- segmented donut (category split) ----------------------------------
function PieDonut({ size = 150, segs }) {
  const data = segs || [
    ['var(--wf-accent)', 34], ['var(--wf-warn)', 24], ['var(--wf-danger)', 18],
    ['var(--wf-ink-soft)', 14], ['var(--wf-line)', 10],
  ];
  const stroke = 26;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flex: 'none' }}>
      {data.map(([col, val], i) => {
        const len = (val / 100) * c;
        const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col}
          strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} />;
        acc += len;
        return el;
      })}
    </svg>
  );
}

// --- KPI card ----------------------------------------------------------
function Kpi({ label, value, hint, accent, sketch = 1 }) {
  return (
    <div className={`wf-card wf-sketch ${sketch === 2 ? 'wf-sketch-2' : ''}`}>
      <div className="wf-lbl-sm">{label}</div>
      <div className="wf-big" style={{ color: accent ? 'var(--wf-accent)' : 'inherit' }}>{value}</div>
      {hint && <div className="wf-row" style={{ gap: 6, fontSize: 14 }}><span className="wf-faint">{hint}</span></div>}
    </div>
  );
}

// --- category progress row --------------------------------------------
function CatRow({ name, spent, threshold, status = 'ok', icon = '▦' }) {
  const ratio = threshold ? spent / threshold : 0;
  return (
    <div className="wf-col" style={{ gap: 7 }}>
      <div className="wf-row wf-between">
        <div className="wf-row" style={{ gap: 10 }}>
          <span className={`wf-dot ${status}`} />
          <span style={{ fontSize: 17 }}>{name}</span>
        </div>
        <div style={{ fontSize: 16 }}><b className="wf-num" style={{ fontSize: 17 }}>{eur(spent)}</b> <span className="wf-faint">/ {eur(threshold)}</span></div>
      </div>
      <div className="wf-track"><div className={`wf-fill ${status === 'ok' ? '' : status}`} style={{ width: Math.min(100, ratio * 100) + '%' }} /></div>
    </div>
  );
}

// sample data shared across variants (from the app's seed/CSV)
const CATS = [
  { name: 'Casa e bollette', spent: 112, threshold: 500, status: 'ok', icon: '⌂' },
  { name: 'Spesa alimentare', spent: 244, threshold: 400, status: 'warn', icon: '🛒' },
  { name: 'Shopping', spent: 264, threshold: 200, status: 'danger', icon: '🛍' },
  { name: 'Trasporti', spent: 97, threshold: 120, status: 'warn', icon: '🚌' },
  { name: 'Ristoranti e bar', spent: 97, threshold: 150, status: 'ok', icon: '☕' },
  { name: 'Abbonamenti', spent: 24, threshold: 50, status: 'ok', icon: '↻' },
  { name: 'Salute', spent: 38, threshold: 100, status: 'ok', icon: '✚' },
];

Object.assign(window, { eur, LineChart, BarChart, Ring, PieDonut, Kpi, CatRow, CATS });
