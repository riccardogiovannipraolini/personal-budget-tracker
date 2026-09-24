/* global React, Icon, eur, statusLabel, NameField, IconPicker */
// Categorie — pagina dedicata: tabella completa di tutte le categorie.
// Riga cliccabile → Dettaglio; nome modificabile inline + elimina (su hover).

function CatRow({ c, onOpen, onRename, onDelete, onIconChange, i }) {
  const pct = Math.round(c.ratio * 100);
  const rem = c.remaining;
  const editable = c.id !== 'senza';
  return (
    <div className="trow rise" role="button" tabIndex={0} style={{ animationDelay: `${0.03 * i}s` }}
      onClick={() => onOpen(c.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(c.id); }}>
      <span className="r-name">
        {editable
          ? <IconPicker icon={c.icon} onChange={(ic) => onIconChange(c.id, ic)} className="cico" />
          : <span className="cico"><Icon name={c.icon} /></span>}
        <span style={{ minWidth: 0, flex: 1 }}>
          {editable
            ? <NameField value={c.name} onRename={(n) => onRename(c.id, n)} style={{ fontSize: 14.5 }} />
            : <span className="nm">{c.name}</span>}
          <div className="sub" style={{ paddingLeft: editable ? 5 : 0 }}>{statusLabel[c.status]}</div>
        </span>
      </span>
      <span className="r-prog">
        <span className={`bar ${c.status}`} style={{ flex: 1 }}><i style={{ width: Math.min(100, c.ratio * 100) + '%' }} /></span>
        <span className="pct">{pct}%</span>
      </span>
      <span className="r-amt">
        <div className="sp">{eur(c.spent)}</div>
        <div className="th">/ {eur(c.threshold)}</div>
      </span>
      <span className={`r-rem col-rem ${rem < 0 ? 'c-danger' : ''}`}>
        {rem < 0 ? `${eur(rem)}` : `${eur(rem)}`}
      </span>
      <span className="row-act">
        {editable && (
          <button className="row-del" title="Elimina categoria"
            onClick={(e) => { e.stopPropagation(); if (confirm(`Eliminare la categoria "${c.name}"? Le sue transazioni torneranno senza categoria.`)) onDelete(c.id); }}>
            <Icon name="trash" style={{ width: 16, height: 16 }} />
          </button>
        )}
        <span className="chev"><Icon name="chev" style={{ width: 18, height: 18 }} /></span>
      </span>
    </div>
  );
}

function Categories({ cats, onOpen, onAdd, onRename, onDelete, onIconChange }) {
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalThreshold = cats.reduce((s, c) => s + c.threshold, 0);
  const remaining = totalThreshold - totalSpent;
  const ratio = totalThreshold ? totalSpent / totalThreshold : 0;
  const pctUsed = Math.round(ratio * 100);
  const status = ratio >= 1 ? 'danger' : ratio >= 0.85 ? 'warn' : 'ok';
  const ordered = [...cats].sort((a, b) => b.ratio - a.ratio);
  const alerts = cats.filter((c) => c.status !== 'ok').length;

  return (
    <div className="screen wide fade">
      <div className="rise" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 18, marginBottom: 30, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 9 }}>Tutte le categorie</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 13, fontSize: 13, flexWrap: 'wrap' }}>
            <span className="faint">{cats.length} categorie</span>
            <span className="faint">·</span>
            <span className="faint">Speso <span className="fig" style={{ color: 'var(--text)' }}>{eur(totalSpent)}</span> di {eur(totalThreshold)}</span>
            {alerts > 0 && (
              <span className={`pill ${cats.some((c) => c.status === 'danger') ? 'danger' : 'warn'}`}>
                <span className={`dot ${cats.some((c) => c.status === 'danger') ? 'danger' : 'warn'}`} />
                {alerts} da tenere d’occhio
              </span>
            )}
          </div>
        </div>
        <button className="btn" onClick={onAdd}>
          <Icon name="plus" style={{ width: 16, height: 16 }} /> Nuova categoria
        </button>
      </div>

      <div className="tbl rise" style={{ animationDelay: '.05s' }}>
        <div className="thd">
          <span>Categoria</span>
          <span>Avanzamento</span>
          <span style={{ textAlign: 'right' }}>Speso / soglia</span>
          <span className="col-rem" style={{ textAlign: 'right' }}>Residuo</span>
          <span></span>
        </div>
        {ordered.map((c, i) => <CatRow key={c.id} c={c} onOpen={onOpen} onRename={onRename} onDelete={onDelete} onIconChange={onIconChange} i={i} />)}
        <div className="tfoot">
          <span style={{ fontWeight: 700, fontSize: 13.5, letterSpacing: '.02em' }}>Totale</span>
          <span className="r-prog">
            <span className={`bar ${status}`} style={{ flex: 1 }}><i style={{ width: Math.min(100, ratio * 100) + '%' }} /></span>
            <span className="pct">{pctUsed}%</span>
          </span>
          <span className="r-amt">
            <div className="sp">{eur(totalSpent)}</div>
            <div className="th">/ {eur(totalThreshold)}</div>
          </span>
          <span className={`r-rem col-rem ${remaining < 0 ? 'c-danger' : ''}`}>{eur(remaining)}</span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Categories });
