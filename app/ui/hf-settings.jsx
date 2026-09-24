/* global React, Icon, eur, statusOf, statusLabel */
// Impostazioni soglie — variant B: slider live + valore digitabile da tastiera.

// Editable threshold figure — type the number directly; slider stays in sync.
function ThresholdField({ value, onChange }) {
  const [draft, setDraft] = React.useState(String(value));
  React.useEffect(() => { setDraft(String(value)); }, [value]);
  const clean = (raw) => Math.max(0, Math.round(Number(raw) || 0));
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3, justifyContent: 'flex-end' }}>
      <input
        className="fig-edit" type="text" inputMode="numeric" aria-label="Soglia mensile"
        value={draft}
        style={{ width: `${Math.max(2, draft.length)}ch` }}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
          setDraft(v);
          if (v !== '') onChange(clean(v));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.target.blur(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clean(value) + 10); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(0, clean(value) - 10)); }
        }}
        onBlur={() => { const n = draft === '' ? value : clean(draft); setDraft(String(n)); onChange(n); }}
      />
      <span className="fig" style={{ fontSize: 22 }}>€</span>
    </span>
  );
}

// Nome categoria modificabile: digiti e confermi con Invio o uscendo dal campo.
function NameField({ value, onRename }) {
  const [draft, setDraft] = React.useState(value);
  React.useEffect(() => { setDraft(value); }, [value]);
  const commit = () => { const n = draft.trim(); if (n && n !== value) onRename(n); else setDraft(value); };
  return (
    <input
      className="name-edit"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setDraft(value); e.target.blur(); } }}
      onBlur={commit}
      aria-label="Nome categoria"
      style={{ fontWeight: 600, fontSize: 15, background: 'transparent', border: '1px solid transparent', borderRadius: 6, padding: '2px 4px', color: 'var(--text)', width: '100%' }}
    />
  );
}

function ThresholdCard({ c, onChange, onRename, onDelete, i }) {
  const ratio = c.threshold ? c.spent / c.threshold : 0;
  const status = statusOf(ratio);
  const max = Math.max(600, Math.ceil((Math.max(c.spent * 1.6, c.threshold * 1.1)) / 50) * 50);
  return (
    <div className="card pad rise" style={{ animationDelay: `${0.05 * i}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span className="cico"><Icon name={c.icon} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <NameField value={c.name} onRename={(n) => onRename(c.id, n)} />
          <div className={`c-${status}`} style={{ fontSize: 12, fontWeight: 600, paddingLeft: 4 }}>{statusLabel[status]}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <ThresholdField value={c.threshold} onChange={(v) => onChange(c.id, v)} />
          <div className="faint" style={{ fontSize: 11.5 }}>al mese · digita o trascina</div>
        </div>
        <button className="btn ghost" title="Elimina categoria" onClick={() => {
          if (confirm(`Eliminare la categoria "${c.name}"? Le sue transazioni torneranno senza categoria.`)) onDelete(c.id);
        }} style={{ padding: 6, color: 'var(--danger)' }}>✕</button>
      </div>

      {/* spent-vs-threshold context bar */}
      <div className={`bar ${status}`} style={{ height: 10, marginBottom: 8 }}>
        <i style={{ width: Math.min(100, ratio * 100) + '%' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 16 }}>
        <span className="faint">speso {eur(c.spent)}</span>
        <span className="faint tnum">{Math.round(ratio * 100)}%</span>
      </div>

      {/* live slider */}
      <input type="range" className="rng" min="0" max={max} step="10" value={c.threshold}
        onChange={(e) => onChange(c.id, Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }} className="faint">
        <span style={{ fontSize: 11 }}>€0</span>
        <span style={{ fontSize: 11 }}>{eur(max)}</span>
      </div>
    </div>
  );
}

function Settings({ cats, onChange, onRename, onDelete, onReset, onAdd }) {
  // "Senza categoria" è un secchiello, non una categoria gestibile: escludila.
  const editable = cats.filter((c) => c.id !== 'senza');
  const total = editable.reduce((s, c) => s + c.threshold, 0);
  return (
    <div className="screen fade">
      <div className="card pad rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="faint" style={{ fontSize: 12.5 }}>Budget mensile totale</div>
            <div className="fig" style={{ fontSize: 28 }}>{eur(total)}</div>
          </div>
          <div className="pill ok"><Icon name="check" style={{ width: 14, height: 14 }} /> Telegram collegato</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn" onClick={onReset}><Icon name="repeat" /> Ricarica</button>
          <button className="btn primary" onClick={onAdd}><Icon name="cross" /> Nuova categoria</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {editable.map((c, i) => (
          <ThresholdCard key={c.id} c={c} onChange={onChange} onRename={onRename} onDelete={onDelete} i={i} />
        ))}
      </div>
      <p className="faint" style={{ fontSize: 12.5, textAlign: 'center', marginTop: 22 }}>
        Trascina per regolare la soglia. Gli avvisi scattano all'80% (attenzione) e al 100% (critico).
      </p>
    </div>
  );
}

Object.assign(window, { Settings });
