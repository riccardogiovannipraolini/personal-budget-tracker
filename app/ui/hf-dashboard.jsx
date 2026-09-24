/* global React, Icon, eur, eurc, statusLabel, Ring, LineChart, BarChart, Count, HISTORY, MONTHS6 */
// Dashboard — variant B: residuo protagonista.

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="fig" style={{ fontSize: 19 }}>{value}</div>
      <div className="faint" style={{ fontSize: 12, marginTop: 3 }}>{label}</div>
    </div>);

}

function AlertLine({ c, onOpen }) {
  const over = c.spent - c.threshold;
  return (
    <button onClick={() => onOpen(c.id)} className="row" style={{ width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', cursor: 'pointer', textAlign: 'left', padding: '12px 0' }}>
      <span className={`cico ${c.status === 'danger' ? 'bg-danger c-danger' : 'bg-warn c-warn'}`} style={{ borderColor: 'transparent' }}><Icon name={c.icon} /></span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, color: 'var(--text)' }}>{c.name}</div>
        <div className="faint" style={{ fontSize: 12.5 }}>{c.status === 'danger' ? `${eur(over)} oltre la soglia` : `${Math.round(c.ratio * 100)}% della soglia`}</div>
      </span>
      <span className={`pill ${c.status}`}>{c.status === 'danger' ? 'Critico' : 'Attenzione'}</span>
    </button>);

}

function CatTile({ c, onOpen, i }) {
  return (
    <button onClick={() => onOpen(c.id)} className="card hover rise" style={{ padding: '15px 16px', textAlign: 'left', animationDelay: `${0.06 * i}s` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 12 }}>
        <span className="cico"><Icon name={c.icon} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
          <div className="faint" style={{ fontSize: 12 }}>resta {eur(Math.max(0, c.remaining))}</div>
        </span>
        <span className={`dot ${c.status}`} />
      </div>
      <div className={`bar ${c.status}`}><i style={{ width: Math.min(100, c.ratio * 100) + '%' }} /></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 9, fontSize: 13 }}>
        <span className="fig">{eur(c.spent)}</span>
        <span className="faint tnum">/ {eur(c.threshold)}</span>
      </div>
    </button>);

}

function Dashboard({ cats, onOpen, period }) {
  const isYear = period === 'year';
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalThreshold = cats.reduce((s, c) => s + c.threshold, 0);
  const remaining = totalThreshold - totalSpent;
  const ratio = totalSpent / totalThreshold;
  const status = ratio >= 1 ? 'danger' : ratio >= 0.85 ? 'warn' : 'ok';
  const alerts = cats.filter((c) => c.status !== 'ok').sort((a, b) => b.ratio - a.ratio);
  const monthly = MONTHS6.map((_, i) => Object.keys(HISTORY).reduce((s, k) => s + HISTORY[k][i], 0));
  const top = [...cats].sort((a, b) => b.spent - a.spent);

  return (
    <div className="screen fade">
      <div className="grid" style={{ gridTemplateColumns: '1.08fr 1fr', alignItems: 'stretch' }}>
        {/* hero */}
        <div className="card pad rise" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, paddingTop: 30, paddingBottom: 30 }}>
          <div className="eyebrow">Ti resta da spendere · {isYear ? '2026' : 'maggio'}</div>
          <Ring size={208} ratio={ratio} status={status}>
            <div>
              <Count value={remaining} format={eur} className="fig" style={{ fontSize: 42, display: 'block', color: remaining < 0 ? 'var(--danger)' : 'var(--text)' }} />
              <div className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>{Math.round((1 - ratio) * 100)}% del budget</div>
            </div>
          </Ring>
          <div style={{ display: 'flex', gap: 34 }}>
            <Stat label="Speso" value={<Count value={totalSpent} format={eur} />} />
            <Stat label="Budget" value={eur(totalThreshold)} />
            <Stat label={isYear ? 'Periodo' : 'Al reset'} value={isYear ? '6 mesi' : '2 gg'} />
          </div>
        </div>

        {/* alerts + trend */}
        <div className="card pad rise" style={{ animationDelay: '.08s', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h3 className="sec-title">Da tenere d'occhio</h3>
            <span className="pill danger" style={{ display: alerts.some((a) => a.status === 'danger') ? 'inline-flex' : 'none' }}>
              {alerts.filter((a) => a.status === 'danger').length} critici
            </span>
          </div>
          {alerts.length ? alerts.map((c) => <AlertLine key={c.id} c={c} onOpen={onOpen} />) :
          <div className="muted" style={{ padding: '20px 0', fontSize: 14 }}>Tutto sotto controllo questo mese 🎉</div>}
          <div style={{ marginTop: 'auto', paddingTop: 18 }}>
            <div className="eyebrow" style={{ marginBottom: 12 }}>Spesa ultimi 6 mesi</div>
            <BarChart data={monthly} months={MONTHS6} height={92} status={status} />
          </div>
        </div>
      </div>

      {/* categories */}
      <div className="card pad rise" style={{ marginTop: 18, animationDelay: '.14s' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="sec-title">Categorie</h3>
          <span className="faint" style={{ fontSize: 13 }}>{cats.length} categorie · clicca per il dettaglio</span>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {top.map((c, i) => <CatTile key={c.id} c={c} onOpen={onOpen} i={i} />)}
        </div>
      </div>
    </div>);

}

Object.assign(window, { Dashboard });