/* global React, Icon, eur, eurc, statusLabel, Ring, LineChart, Count, TXNS, HISTORY, MONTHS6 */
// Category detail — variant B: ring + transaction list, trend below.

function TxnRow({ t }) {
  const cats = window.__CATEGORIES || [];
  const ex = !!t.excluded;
  return (
    <div className="row" style={{ padding: '12px 0', opacity: ex ? 0.5 : 1 }}>
      <span className="cico" style={{ width: 34, height: 34 }}><Icon name="tag" style={{ width: 16, height: 16 }} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
          {t.merchant}
          {ex && <span className="pill" style={{ fontSize: 10, padding: '1px 7px', background: 'var(--surface-3)', color: 'var(--text-2)', borderColor: 'var(--line)' }}>esclusa</span>}
        </div>
        <div className="faint" style={{ fontSize: 12 }}>{t.desc}</div>
      </span>
      {/* selettore categoria inline: cambia → impara e ri-categorizza l'esercente */}
      <select
        className="cat-select"
        defaultValue={t.bcat == null ? '' : String(t.bcat)}
        onChange={(e) => window.__relabel(t.id, e.target.value)}
        title="Sposta in categoria (impara dall'esercente)"
        style={{
          fontSize: 12, marginRight: 10, maxWidth: 150,
          background: 'var(--surface-2)', color: 'var(--text-2)',
          border: '1px solid var(--line)', borderRadius: 8, padding: '5px 8px',
        }}
      >
        <option value="">Senza categoria</option>
        {cats.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
      </select>
      {/* escludi/reincludi dai conteggi (es. spesa anticipata poi rimborsata) */}
      <button
        className="btn ghost icon"
        onClick={() => window.__setExcluded(t.id, !ex)}
        title={ex ? 'Reincludi nei conteggi' : 'Escludi dai conteggi (es. rimborsata)'}
        style={{ padding: 6, marginRight: 4 }}
      >
        <Icon name={ex ? 'eye' : 'eye-off'} style={{ width: 15, height: 15 }} />
      </button>
      {/* elimina definitivamente */}
      <button
        className="btn ghost icon"
        onClick={() => { if (confirm(`Eliminare la transazione "${t.merchant}" (${eurc(Math.abs(t.amount))})?`)) window.__deleteTransaction(t.id); }}
        title="Elimina transazione"
        style={{ padding: 6, marginRight: 10 }}
      >
        <Icon name="trash" style={{ width: 15, height: 15 }} />
      </button>
      <span className="faint tnum" style={{ fontSize: 12.5, width: 56, textAlign: 'right' }}>{t.day}</span>
      <span className="fig" style={{ fontSize: 14.5, width: 78, textAlign: 'right', textDecoration: ex ? 'line-through' : 'none' }}>−{eurc(Math.abs(t.amount))}</span>
    </div>
  );
}

// Editor soglia inline: numero digitabile + slider. Edita sempre la soglia MENSILE.
function InlineThreshold({ c, onChange, period }) {
  const [draft, setDraft] = React.useState(String(c.monthlyThreshold));
  React.useEffect(() => { setDraft(String(c.monthlyThreshold)); }, [c.monthlyThreshold]);
  const clean = (raw) => Math.max(0, Math.round(Number(raw) || 0));
  const max = Math.max(600, Math.ceil((Math.max(c.spent * 1.6, c.monthlyThreshold * 1.1)) / 50) * 50);
  return (
    <div style={{ width: '100%', borderTop: '1px solid var(--line)', paddingTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="faint" style={{ fontSize: 12 }}>Soglia mensile · digita o trascina</span>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
          <input
            className="fig-edit" type="text" inputMode="numeric" aria-label="Soglia mensile"
            value={draft}
            style={{ width: `${Math.max(2, draft.length)}ch`, fontSize: 22 }}
            onFocus={(e) => e.target.select()}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6); setDraft(v); if (v !== '') onChange(c.id, clean(v)); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.target.blur(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); onChange(c.id, clean(c.monthlyThreshold) + 10); }
              if (e.key === 'ArrowDown') { e.preventDefault(); onChange(c.id, Math.max(0, clean(c.monthlyThreshold) - 10)); }
            }}
            onBlur={() => { const n = draft === '' ? c.monthlyThreshold : clean(draft); setDraft(String(n)); onChange(c.id, n); }}
          />
          <span className="fig" style={{ fontSize: 17 }}>€</span>
        </span>
      </div>
      <input type="range" className="rng" min="0" max={max} step="10" value={c.monthlyThreshold}
        onChange={(e) => onChange(c.id, Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }} className="faint">
        <span style={{ fontSize: 11 }}>€0</span>
        <span style={{ fontSize: 11 }}>{period === 'year' ? `= ${eur(c.monthlyThreshold * 6)}/anno` : eur(max)}</span>
      </div>
    </div>
  );
}

function Detail({ cats, catId, onSelect, onEdit, onChange, period }) {
  const c = cats.find((x) => x.id === catId) || cats[0];
  const txns = TXNS.filter((t) => t.catId === c.id);
  const pct = Math.round(c.ratio * 100);
  const hist = HISTORY[c.id] || [0, 0, 0, 0, 0, c.spent];

  return (
    <div className="screen fade">
      {/* category switcher */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, marginBottom: 4 }}>
        {cats.map((x) => (
          <button key={x.id} onClick={() => onSelect(x.id)}
            className="btn" style={{
              padding: '7px 13px', flex: 'none',
              borderColor: x.id === c.id ? 'transparent' : 'var(--line)',
              background: x.id === c.id ? 'var(--surface-3)' : 'transparent',
              color: x.id === c.id ? 'var(--text)' : 'var(--text-2)',
            }}>
            <Icon name={x.icon} style={{ width: 15, height: 15 }} /> {x.name}
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: '360px 1fr', alignItems: 'stretch' }}>
        {/* ring summary */}
        <div className="card pad rise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, paddingTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}>
            <span className={`cico lg ${c.status === 'ok' ? '' : c.status === 'warn' ? 'bg-warn c-warn' : 'bg-danger c-danger'}`} style={{ borderColor: c.status === 'ok' ? 'var(--line)' : 'transparent' }}><Icon name={c.icon} /></span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
              <div className={`c-${c.status}`} style={{ fontSize: 12.5, fontWeight: 600 }}>{statusLabel[c.status]}</div>
            </div>
          </div>
          <Ring size={186} ratio={c.ratio} status={c.status}>
            <div>
              <Count value={pct} format={(v) => Math.round(v) + '%'} className="fig" style={{ fontSize: 38, display: 'block' }} />
              <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>della soglia</div>
            </div>
          </Ring>
          <div className="fig" style={{ fontSize: 20 }}>
            {eur(c.spent)} <span className="faint" style={{ fontSize: 15 }}>/ {eur(c.threshold)}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <div className="card" style={{ flex: 1, padding: '11px 14px', background: 'var(--surface-2)' }}>
              <div className="faint" style={{ fontSize: 11.5 }}>Residuo</div>
              <div className="fig" style={{ fontSize: 17, color: c.remaining < 0 ? 'var(--danger)' : 'var(--text)' }}>{eur(c.remaining)}</div>
            </div>
            <div className="card" style={{ flex: 1, padding: '11px 14px', background: 'var(--surface-2)' }}>
              <div className="faint" style={{ fontSize: 11.5 }}>Transazioni</div>
              <div className="fig" style={{ fontSize: 17 }}>{txns.length}</div>
            </div>
          </div>
          <InlineThreshold c={c} onChange={onChange} period={period} />
          <button className="btn ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 13 }} onClick={onEdit}>
            <Icon name="gear" style={{ width: 15, height: 15 }} /> Gestisci categoria
          </button>
        </div>

        {/* transactions */}
        <div className="card pad rise" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <h3 className="sec-title">Transazioni · maggio</h3>
            <span className="faint" style={{ fontSize: 13 }}>{txns.length} voci</span>
          </div>
          <div className="scroll" style={{ flex: 1, maxHeight: 348, paddingRight: 6 }}>
            {txns.map((t) => <TxnRow key={t.id} t={t} />)}
          </div>
        </div>
      </div>

      {/* trend */}
      <div className="card pad rise" style={{ marginTop: 18, animationDelay: '.14s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 className="sec-title">Andamento ultimi 6 mesi</h3>
          <span className="pill" style={{ background: 'var(--surface-2)', color: 'var(--text-2)', borderColor: 'var(--line)' }}>
            media {eur(hist.reduce((a, b) => a + b, 0) / 6)}/mese
          </span>
        </div>
        <LineChart data={hist} months={MONTHS6} height={150} status={c.status} />
      </div>
    </div>
  );
}

Object.assign(window, { Detail });
