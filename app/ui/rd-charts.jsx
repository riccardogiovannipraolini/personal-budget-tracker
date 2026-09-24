/* global React, Icon, PICK_ICONS */
// Chart primitives minimal. Accent = CSS var --acc.
const { useState, useEffect, useRef, useId } = React;
const CHART_COL = { ok: 'var(--acc)', warn: 'var(--warn)', danger: 'var(--danger)', neutral: 'var(--text-2)' };

function useMount(delay = 60) {
  const [on, setOn] = useState(false);
  useEffect(() => { const t = setTimeout(() => setOn(true), delay); return () => clearTimeout(t); }, [delay]);
  return on;
}

// Count-up number
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
    const safety = setTimeout(() => { setV(b); from.current = b; }, dur + 250);
    return () => { cancelAnimationFrame(raf); clearTimeout(safety); };
  }, [value, dur]);
  return <span className={className} style={style}>{format ? format(v) : Math.round(v)}</span>;
}

// Area + line chart (animated draw). zeroBaseline ancora il grafico a 0.
function LineChart({ data, height = 150, status = 'ok', months, zeroBaseline = false }) {
  const on = useMount(200);
  const pad = 6;
  const W = 600;
  const H = height;
  const max = Math.max(...data) * (zeroBaseline ? 1.12 : 1.18) || 1;
  const min = zeroBaseline ? 0 : Math.min(...data) * 0.6;
  const span = max - min || 1;
  const sx = W / (data.length - 1);
  const pts = data.map((d, i) => [i * sx, H - pad - ((d - min) / span) * (H - pad * 2)]);
  const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = path + ` L${W} ${H} L0 ${H} Z`;
  const col = CHART_COL[status];
  const gid = useId().replace(/:/g, '');
  const ref = useRef(null);
  const [len, setLen] = useState(0);
  useEffect(() => { if (ref.current) setLen(ref.current.getTotalLength()); }, [data]);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={'la' + gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={col} stopOpacity={zeroBaseline ? '0.18' : '0.22'} />
            <stop offset="100%" stopColor={col} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.5, 1].map((g, i) => <line key={i} x1="0" x2={W} y1={H * (g === 1 ? 0.5 : 0.16)} y2={H * (g === 1 ? 0.5 : 0.16)} stroke="var(--line)" strokeWidth="1" />)}
        <path d={area} fill={`url(#la${gid})`} style={{ opacity: on ? 1 : 0, transition: 'opacity .9s ease .4s' }} />
        <path ref={ref} d={path} fill="none" stroke={col} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={len} strokeDashoffset={on ? 0 : len}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,.8,.3,1)' }} />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 4 : 0} fill="var(--surface)" stroke={col} strokeWidth="2.4"
            style={{ opacity: on ? 1 : 0, transition: `opacity .4s ease ${0.9 + i * 0.05}s` }} />
        ))}
      </svg>
      {months && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11 }} className="faint tnum">
        {months.map((m) => <span key={m}>{m}</span>)}
      </div>}
    </div>
  );
}

// Nome categoria modificabile inline (condiviso da Categorie e Dettaglio).
// Sembra testo finché non lo metti a fuoco; conferma con Invio o uscendo dal campo.
// stopPropagation così non scatena il click della riga che apre il Dettaglio.
function NameField({ value, onRename, style }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { const n = draft.trim(); if (n && n !== value) onRename(n); else setDraft(value); };
  return (
    <input className="name-edit" value={draft} aria-label="Nome categoria"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setDraft(value); e.target.blur(); } }}
      onBlur={commit}
      style={style} />
  );
}

// Icona categoria modificabile: badge cliccabile che apre un popover con la
// griglia icone (stessa lista/stile della modale "Nuova categoria"). Condiviso
// da Categorie e Dettaglio. stopPropagation così non scatena il click della riga.
function IconPicker({ icon, onChange, className, style, title }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className="icon-pop-wrap" ref={ref}
      onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
      <button type="button" className={`${className} icon-trigger`} style={style} title={title || 'Cambia icona'}
        onClick={() => setOpen((v) => !v)}>
        <Icon name={icon} />
      </button>
      {open && (
        <div className="icon-pop">
          <div className="icon-grid">
            {PICK_ICONS.map((ic) => (
              <button key={ic} type="button" className={`icon-pick ${ic === icon ? 'on' : ''}`} title={ic}
                onClick={() => { onChange(ic); setOpen(false); }}>
                <Icon name={ic} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Count, LineChart, useMount, NameField, IconPicker });
