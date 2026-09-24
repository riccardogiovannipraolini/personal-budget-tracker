/* global React, LineChart, BarChart, Ring, PieDonut, Kpi, CatRow, CATS, eur */
// Three distinct dashboard wireframe layouts.

function TopBar({ title = 'Budget Tracker' }) {
  return (
    <div className="wf-top">
      <div className="wf-row" style={{ gap: 12 }}>
        <span className="wf-ico wf-ico-lg">€</span>
        <div>
          <h1 className="wf-h1">{title}</h1>
          <div className="wf-period">◷ Maggio 2026 · <span className="wf-faint">aggiornato 2 min fa</span></div>
        </div>
      </div>
      <div className="wf-row" style={{ gap: 10 }}>
        <span className="wf-chip wf-chip-on">Mese</span>
        <span className="wf-chip">Anno</span>
        <span className="wf-btn wf-btn-accent">↻ Sincronizza</span>
      </div>
    </div>
  );
}

function AlertItem({ name, over, status }) {
  return (
    <div className="wf-row wf-between" style={{ padding: '8px 0', borderBottom: '1.6px dashed var(--wf-line)' }}>
      <div className="wf-row" style={{ gap: 9 }}>
        <span className={`wf-dot ${status}`} />
        <span style={{ fontSize: 16 }}>{name}</span>
      </div>
      <span className={`wf-badge ${status}`}>{status === 'danger' ? `+${eur(over)} oltre` : 'vicino alla soglia'}</span>
    </div>
  );
}

/* ============ A · Classica (KPI in alto) ============ */
function DashA() {
  return (
    <div className="wf-frame">
      <TopBar />
      <div className="wf-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Kpi label="Budget residuo" value={eur(644)} hint="su €1520 totali" accent />
        <Kpi label="Speso questo mese" value={eur(876)} hint="58% del budget" />
        <Kpi label="Categorie sopra soglia" value="1" hint="2 vicine al limite" />
      </div>
      <div className="wf-grid wf-grow" style={{ gridTemplateColumns: '1.5fr 1fr', alignItems: 'stretch' }}>
        <div className="wf-card wf-sketch">
          <div className="wf-row wf-between">
            <div className="wf-h2">Andamento spesa</div>
            <span className="wf-chip">ultimi 9 giorni</span>
          </div>
          <LineChart h={150} />
          <div className="wf-row wf-between wf-faint" style={{ fontSize: 13 }}><span>1 mag</span><span>15 mag</span><span>29 mag</span></div>
        </div>
        <div className="wf-card wf-sketch wf-sketch-2">
          <div className="wf-h2">⚠ Avvisi</div>
          <AlertItem name="Shopping" over={64} status="danger" />
          <AlertItem name="Spesa alimentare" status="warn" />
          <AlertItem name="Trasporti" status="warn" />
          <div className="wf-faint" style={{ fontSize: 14, marginTop: 'auto' }}>Notifiche inviate su Telegram ✓</div>
        </div>
      </div>
      <div className="wf-card wf-sketch">
        <div className="wf-h2">Categorie</div>
        <div className="wf-grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 32, rowGap: 12 }}>
          {CATS.slice(0, 6).map((c) => <CatRow key={c.name} {...c} />)}
        </div>
      </div>
      <div className="wf-note" style={{ right: 30, bottom: 14 }}>card = link al dettaglio categoria</div>
    </div>
  );
}

/* ============ B · Residuo protagonista (ring hero) ============ */
function DashB() {
  return (
    <div className="wf-frame">
      <TopBar />
      <div className="wf-grid wf-grow" style={{ gridTemplateColumns: '1.1fr 1fr', alignItems: 'stretch' }}>
        <div className="wf-card wf-sketch" style={{ alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div className="wf-lbl-sm">Ti resta da spendere</div>
          <Ring size={190} ratio={0.58} status="ok" label={eur(644)} sub="42% del budget" />
          <div className="wf-row" style={{ gap: 26 }}>
            <div className="wf-col" style={{ alignItems: 'center' }}><span className="wf-num">{eur(876)}</span><span className="wf-faint" style={{ fontSize: 13 }}>speso</span></div>
            <div className="wf-col" style={{ alignItems: 'center' }}><span className="wf-num">{eur(1520)}</span><span className="wf-faint" style={{ fontSize: 13 }}>budget</span></div>
            <div className="wf-col" style={{ alignItems: 'center' }}><span className="wf-num">19 gg</span><span className="wf-faint" style={{ fontSize: 13 }}>al reset</span></div>
          </div>
        </div>
        <div className="wf-card wf-sketch wf-sketch-2">
          <div className="wf-h2">⚠ Da tenere d'occhio</div>
          <AlertItem name="Shopping" over={64} status="danger" />
          <AlertItem name="Spesa alimentare" status="warn" />
          <AlertItem name="Trasporti" status="warn" />
          <div className="wf-hr" />
          <div className="wf-lbl-sm">Andamento ultimi 6 mesi</div>
          <BarChart h={96} />
        </div>
      </div>
      <div className="wf-card wf-sketch">
        <div className="wf-row wf-between"><div className="wf-h2">Top categorie</div><span className="wf-chip">vedi tutte →</span></div>
        <div className="wf-grid" style={{ gridTemplateColumns: '1fr 1fr', columnGap: 32, rowGap: 11 }}>
          {CATS.slice(0, 4).map((c) => <CatRow key={c.name} {...c} />)}
        </div>
      </div>
      <div className="wf-note" style={{ left: 40, bottom: 12 }}>numero grande = risposta a "quanto mi resta?"</div>
    </div>
  );
}

/* ============ C · Analytics con sidebar ============ */
function DashC() {
  const nav = ['€', '◫', '⚠', '⚙'];
  return (
    <div className="wf-frame" style={{ flexDirection: 'row', gap: 22, padding: '22px 24px' }}>
      <div className="wf-side">
        <span className="wf-ico wf-ico-lg" style={{ borderColor: 'var(--wf-accent)' }}>€</span>
        <div className="wf-col" style={{ gap: 14, marginTop: 8 }}>
          {nav.slice(1).map((n, i) => <span key={i} className={`wf-ico ${i === 0 ? 'active' : ''}`}>{n}</span>)}
        </div>
      </div>
      <div className="wf-col wf-grow" style={{ gap: 16 }}>
        <div className="wf-top">
          <div><h1 className="wf-h1">Panoramica</h1><div className="wf-period">Maggio 2026</div></div>
          <span className="wf-btn wf-btn-accent">↻ Sincronizza</span>
        </div>
        <div className="wf-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
          <Kpi label="Residuo" value={eur(644)} accent />
          <Kpi label="Speso" value={eur(876)} />
          <Kpi label="Budget" value={eur(1520)} />
          <Kpi label="Avvisi" value="3" />
        </div>
        <div className="wf-grid wf-grow" style={{ gridTemplateColumns: '1.4fr 1fr' }}>
          <div className="wf-card wf-sketch">
            <div className="wf-h2">Andamento spesa</div>
            <LineChart h={150} />
          </div>
          <div className="wf-card wf-sketch wf-sketch-2" style={{ alignItems: 'center' }}>
            <div className="wf-h2" style={{ alignSelf: 'flex-start' }}>Per categoria</div>
            <PieDonut size={150} />
            <div className="wf-col" style={{ gap: 5, alignSelf: 'stretch', fontSize: 14 }}>
              {[['Spesa', 'ok'], ['Shopping', 'danger'], ['Casa', 'warn']].map(([n, s]) => (
                <div key={n} className="wf-row wf-between"><span className="wf-row" style={{ gap: 8 }}><span className={`wf-dot ${s}`} />{n}</span><span className="wf-faint">{s === 'danger' ? '30%' : s === 'warn' ? '21%' : '28%'}</span></div>
              ))}
            </div>
          </div>
        </div>
        <div className="wf-card wf-sketch">
          <div className="wf-tr wf-th" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', borderBottomStyle: 'solid' }}>
            <span>Categoria</span><span>Speso</span><span>Soglia</span><span>Stato</span>
          </div>
          {CATS.slice(0, 4).map((c) => (
            <div key={c.name} className="wf-tr" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr', fontSize: 16 }}>
              <span className="wf-row" style={{ gap: 8 }}><span className={`wf-dot ${c.status}`} />{c.name}</span>
              <span>{eur(c.spent)}</span><span className="wf-faint">{eur(c.threshold)}</span>
              <span><span className={`wf-badge ${c.status}`}>{c.status === 'danger' ? 'oltre' : c.status === 'warn' ? 'vicino' : 'ok'}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashA, DashB, DashC });
