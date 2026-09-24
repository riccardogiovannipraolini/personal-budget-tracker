/* global React, Icon, eur, eurc, statusLabel, LineChart, NameField, IconPicker, HISTORY, MONTHS6 */
// Detail REDESIGN — minimale: header gerarchico + transazioni a tabella + trend.

function Stat({ label, value, color }) {
  return (
    <div>
      <div className="faint" style={{ fontSize: 11.5, letterSpacing: '.03em' }}>{label}</div>
      <div className="fig" style={{ fontSize: 19, marginTop: 4, color: color || 'var(--text)' }}>{value}</div>
    </div>
  );
}

// Editor soglia mensile: numero digitabile + slider, minimale.
function InlineThreshold({ c, onChange, period }) {
  const [draft, setDraft] = React.useState(String(c.monthlyThreshold));
  React.useEffect(() => { setDraft(String(c.monthlyThreshold)); }, [c.monthlyThreshold]);
  const clean = (raw) => Math.max(0, Math.round(Number(raw) || 0));
  const max = Math.max(600, Math.ceil((Math.max(c.spent * 1.6, c.monthlyThreshold * 1.1)) / 50) * 50);
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
        <span className="eyebrow">Soglia mensile · tocca per modificare</span>
        <label className="thr-field" title="Modifica la soglia">
          <Icon name="edit" />
          <input
            className="fig-edit" type="text" inputMode="numeric" aria-label="Soglia mensile"
            value={draft}
            style={{ width: `${Math.max(2, draft.length)}ch` }}
            onFocus={(e) => e.target.select()}
            onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6); setDraft(v); if (v !== '') onChange(c.id, clean(v)); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.target.blur(); }
              if (e.key === 'ArrowUp') { e.preventDefault(); onChange(c.id, clean(c.monthlyThreshold) + 10); }
              if (e.key === 'ArrowDown') { e.preventDefault(); onChange(c.id, Math.max(0, clean(c.monthlyThreshold) - 10)); }
            }}
            onBlur={() => { const n = draft === '' ? c.monthlyThreshold : clean(draft); setDraft(String(n)); onChange(c.id, n); }}
          />
          <span className="fig" style={{ fontSize: 15, color: 'var(--text-2)' }}>€</span>
        </label>
      </div>
      <input type="range" className="rng" min="0" max={max} step="10" value={c.monthlyThreshold}
        onChange={(e) => onChange(c.id, Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }} className="faint">
        <span style={{ fontSize: 11 }}>€0</span>
        <span style={{ fontSize: 11 }}>{period === 'year' ? `= ${eur(c.monthlyThreshold * 6)}/anno` : eur(max)}</span>
      </div>
    </div>
  );
}

function TxnRow({ t, cats, open, onOpenChange, onToggleExclude, onReassign, onDelete }) {
  return (
    <div className="txn-wrap">
      <div className={`txn ${t.excluded ? 'excluded' : ''}`}>
        <span className="cico" style={{ width: 34, height: 34 }}><Icon name="tag" style={{ width: 15, height: 15 }} /></span>
        <span style={{ minWidth: 0 }}>
          <div className="mt">{t.merchant}</div>
          <div className="md">{t.excluded ? 'Esclusa dal conteggio' : t.desc}</div>
        </span>
        <span className="dy">{t.day}</span>
        <span className="am">−{eurc(Math.abs(t.amount))}</span>
        <button className={`txn-act ${open ? 'on' : ''}`} title="Opzioni" onClick={() => onOpenChange(open ? null : t.id)}>
          <Icon name="dots" />
        </button>
      </div>
      {open && (
        <div className="txn-panel">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="txn-opt" onClick={() => onToggleExclude(t.id, !t.excluded)}>
              <Icon name={t.excluded ? 'check' : 'ban'} />
              {t.excluded ? 'Conteggia di nuovo' : 'Non conteggiare'}
            </button>
            <button className="txn-opt danger" onClick={() => {
              if (confirm('Eliminare questa transazione? Tornerà alla prossima sincronizzazione se ancora presente in banca.')) onDelete(t.id);
            }}>
              <Icon name="trash" /> Elimina
            </button>
          </div>
          <div className="txn-reassign">
            <span className="faint" style={{ fontSize: 11.5, letterSpacing: '.02em' }}>Sposta in categoria</span>
            <div className="txn-cats">
              {cats.map((cat) => (
                <button key={cat.id} className={`txn-cat ${cat.id === t.catId ? 'on' : ''}`} title={cat.name}
                  onClick={() => onReassign(t.id, cat.id)}>
                  <Icon name={cat.icon} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ cats, catId, onSelect, onChange, period, txns, onToggleExclude, onReassign, onDelete, onRenameCat, onDeleteCat, onIconChange }) {
  const c = cats.find((x) => x.id === catId) || cats[0];
  const catEditable = c.id !== 'senza';
  const [openTxn, setOpenTxn] = React.useState(null);
  const catTxns = txns.filter((t) => t.catId === c.id);
  const counted = catTxns.filter((t) => !t.excluded).length;
  const excludedCount = catTxns.length - counted;
  const pct = Math.round(c.ratio * 100);
  const hist = HISTORY[c.id] || [0, 0, 0, 0, 0, c.spent];
  const avg = hist.reduce((a, b) => a + b, 0) / 6;
  // Andamento: spesa mensile (Mese) o cumulata year-to-date (Anno).
  const isYear = period === 'year';
  const cumulative = hist.reduce((acc, m, i) => { acc.push((acc[i - 1] || 0) + m); return acc; }, []);
  const totalYear = cumulative[cumulative.length - 1];
  const trendData = isYear ? cumulative : hist;

  return (
    <div className="screen fade">
      {/* switcher categorie */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 22, marginBottom: 4 }}>
        {cats.map((x) => (
          <button key={x.id} onClick={() => onSelect(x.id)}
            className="btn" style={{
              padding: '7px 13px', flex: 'none', fontSize: 13,
              borderColor: x.id === c.id ? 'transparent' : 'var(--line)',
              background: x.id === c.id ? 'var(--surface-3)' : 'transparent',
              color: x.id === c.id ? 'var(--text)' : 'var(--text-3)',
            }}>
            <Icon name={x.icon} style={{ width: 15, height: 15 }} /> {x.name}
          </button>
        ))}
      </div>

      {/* HEADER gerarchico */}
      <div className="rise" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 20 }}>
            {catEditable ? (
              <IconPicker icon={c.icon} onChange={(ic) => onIconChange(c.id, ic)}
                className={`cico lg ${c.status === 'ok' ? '' : c.status === 'warn' ? 'c-warn' : 'c-danger'}`}
                style={{ background: c.status === 'ok' ? 'var(--surface-2)' : `color-mix(in oklab, var(--${c.status === 'warn' ? 'warn' : 'danger'}) 15%, transparent)`, borderColor: 'transparent' }} />
            ) : (
              <span className={`cico lg ${c.status === 'ok' ? '' : c.status === 'warn' ? 'c-warn' : 'c-danger'}`}
                style={{ background: c.status === 'ok' ? 'var(--surface-2)' : `color-mix(in oklab, var(--${c.status === 'warn' ? 'warn' : 'danger'}) 15%, transparent)`, borderColor: 'transparent' }}>
                <Icon name={c.icon} />
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {catEditable
                ? <NameField value={c.name} onRename={(n) => onRenameCat(c.id, n)} style={{ fontWeight: 700, fontSize: 17 }} />
                : <div style={{ fontWeight: 700, fontSize: 17 }}>{c.name}</div>}
              <div className={`c-${c.status}`} style={{ fontSize: 12.5, fontWeight: 600, marginTop: 1, paddingLeft: catEditable ? 5 : 0 }}>{statusLabel[c.status]}</div>
            </div>
            {catEditable && (
              <button className="btn ghost" title="Elimina categoria" style={{ padding: 7, color: 'var(--danger)', flex: 'none' }}
                onClick={() => { if (confirm(`Eliminare la categoria "${c.name}"? Le sue transazioni torneranno senza categoria.`)) onDeleteCat(c.id); }}>
                <Icon name="trash" style={{ width: 18, height: 18 }} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span className="fig" style={{ fontSize: 46, lineHeight: 1, color: c.remaining < 0 ? 'var(--danger)' : 'var(--text)' }}>{eur(c.spent)}</span>
            <span className="faint fig" style={{ fontSize: 19 }}>/ {eur(c.threshold)}</span>
          </div>
          <div className={`bar ${c.status}`} style={{ marginTop: 18, height: 6 }}><i style={{ width: Math.min(100, c.ratio * 100) + '%' }} /></div>
          <InlineThreshold c={c} onChange={onChange} period={period} />
        </div>

        {/* stat a griglia */}
        <div className="card pad" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px 20px' }}>
          <Stat label="% della soglia" value={`${pct}%`} color={`var(--${c.status === 'ok' ? 'acc' : c.status})`} />
          <Stat label="Residuo" value={eur(c.remaining)} color={c.remaining < 0 ? 'var(--danger)' : null} />
          <Stat label="Transazioni" value={excludedCount ? `${counted} di ${catTxns.length}` : counted} />
          <Stat label="Media 6 mesi" value={`${eur(avg)}`} />
        </div>
      </div>

      {/* TRANSAZIONI (sx) + ANDAMENTO (dx) — falsariga della dashboard */}
      <div className="hero-grid rise" style={{ marginTop: 34, animationDelay: '.08s' }}>
        <div className="card pad block">
          <div className="sec-head" style={{ marginBottom: 6 }}>
            <h3 className="sec-title">Transazioni recenti</h3>
            <span className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {catTxns.length} voci{excludedCount ? ` · ${excludedCount} escluse` : ' · maggio'}
            </span>
          </div>
          <div className="scroll" style={{ flex: 1, minHeight: 0, maxHeight: 360, paddingRight: 6, marginTop: 4 }}>
            {catTxns.length ? catTxns.map((t) => (
              <TxnRow key={t.id} t={t} cats={cats} open={openTxn === t.id} onOpenChange={setOpenTxn}
                onToggleExclude={onToggleExclude} onReassign={onReassign} onDelete={onDelete} />
            )) : <div className="muted" style={{ padding: '24px 0', fontSize: 14 }}>Nessuna transazione questo mese.</div>}
          </div>
        </div>
        <div className="card pad block">
          <div className="sec-head" style={{ marginBottom: 6 }}>
            <h3 className="sec-title">{isYear ? 'Andamento · annuale' : 'Andamento · mensile'}</h3>
            <span className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{isYear ? 'spesa cumulata' : `media ${eur(avg)}/mese`}</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <LineChart data={trendData} months={MONTHS6} height={150} status={c.status} zeroBaseline={isYear} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{isYear ? 'totale anno' : 'media mensile'}</span>
            <span className="fig" style={{ fontSize: 14 }}>{isYear ? eur(totalYear) : eur(avg)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Detail });
