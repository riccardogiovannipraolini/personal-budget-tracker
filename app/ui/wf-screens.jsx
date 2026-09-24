/* global React, LineChart, BarChart, Ring, Kpi, CatRow, CATS, eur */
// Category detail, notifications, settings — wireframe variants.

const TXNS = [
  ['Esselunga', 'Spesa settimanale', '03 mag', 62.40],
  ['Conad', 'Spesa', '13 mag', 41.10],
  ['Esselunga', 'Spesa', '18 mag', 66.70],
  ['Esselunga', 'Spesa', '27 mag', 66.70],
];

function BackBar({ title, status = 'warn' }) {
  return (
    <div className="wf-top">
      <div className="wf-row" style={{ gap: 12 }}>
        <span className="wf-ico">←</span>
        <span className="wf-ico wf-ico-lg">🛒</span>
        <div><h1 className="wf-h1">{title}</h1><div className="wf-period">Maggio 2026</div></div>
      </div>
      <span className={`wf-badge ${status}`} style={{ fontSize: 15, padding: '5px 14px' }}>vicino alla soglia</span>
    </div>
  );
}

/* ===== Dettaglio categoria — A: riepilogo + timeline ===== */
function CatDetailA() {
  return (
    <div className="wf-frame">
      <BackBar title="Spesa alimentare" />
      <div className="wf-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <Kpi label="Speso" value={eur(244)} accent />
        <Kpi label="Soglia mensile" value={eur(400)} />
        <Kpi label="Residuo" value={eur(156)} hint="61% usato" />
      </div>
      <div className="wf-card wf-sketch">
        <div className="wf-row wf-between"><div className="wf-h2">Andamento categoria</div><span className="wf-chip">6 mesi</span></div>
        <BarChart h={120} />
      </div>
      <div className="wf-card wf-sketch wf-grow">
        <div className="wf-row wf-between"><div className="wf-h2">Transazioni</div><span className="wf-chip">12 voci</span></div>
        {TXNS.map((t, i) => (
          <div key={i} className="wf-tr" style={{ gridTemplateColumns: '34px 1.6fr 1fr auto', gap: 12, fontSize: 16 }}>
            <span className="wf-ico" style={{ width: 30, height: 30, fontSize: 14 }}>🛒</span>
            <span className="wf-col"><b>{t[0]}</b><span className="wf-faint" style={{ fontSize: 13 }}>{t[1]}</span></span>
            <span className="wf-faint">{t[2]}</span>
            <span className="wf-num" style={{ fontSize: 17 }}>− {eur(t[3])}</span>
          </div>
        ))}
      </div>
      <div className="wf-note" style={{ right: 30, top: 96 }}>arrivi qui da una card dashboard</div>
    </div>
  );
}

/* ===== Dettaglio categoria — B: ring + split ===== */
function CatDetailB() {
  return (
    <div className="wf-frame">
      <BackBar title="Spesa alimentare" />
      <div className="wf-grid wf-grow" style={{ gridTemplateColumns: '0.9fr 1.3fr', alignItems: 'stretch' }}>
        <div className="wf-card wf-sketch" style={{ alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Ring size={170} ratio={0.61} status="warn" label="61%" sub="della soglia" />
          <div className="wf-h2">{eur(244)} <span className="wf-faint" style={{ fontSize: 17 }}>/ {eur(400)}</span></div>
          <span className="wf-btn">⚙ Modifica soglia</span>
        </div>
        <div className="wf-card wf-sketch wf-sketch-2">
          <div className="wf-h2">Transazioni recenti</div>
          {TXNS.map((t, i) => (
            <div key={i} className="wf-tr" style={{ gridTemplateColumns: '1.6fr 1fr auto', gap: 12, fontSize: 16 }}>
              <span className="wf-col"><b>{t[0]}</b><span className="wf-faint" style={{ fontSize: 13 }}>{t[1]}</span></span>
              <span className="wf-faint">{t[2]}</span>
              <span className="wf-num" style={{ fontSize: 17 }}>− {eur(t[3])}</span>
            </div>
          ))}
          <div className="wf-faint" style={{ fontSize: 14, marginTop: 'auto' }}>+ altre 8 voci →</div>
        </div>
      </div>
      <div className="wf-card wf-sketch"><div className="wf-lbl-sm">Andamento</div><LineChart h={86} accent="var(--wf-warn)" /></div>
    </div>
  );
}

/* ===== Notifiche — A: feed unico ===== */
const ALERTS = [
  ['danger', 'Shopping', 'Hai superato la soglia di €200', '+€64 oltre · oggi'],
  ['warn', 'Spesa alimentare', 'Sei all\'85% della soglia mensile', '2 giorni fa'],
  ['warn', 'Trasporti', 'Sei all\'81% della soglia mensile', '3 giorni fa'],
  ['ok', 'Sync', '20 nuove transazioni importate', '5 giorni fa'],
];
function NotifA() {
  return (
    <div className="wf-frame">
      <div className="wf-top">
        <div className="wf-row" style={{ gap: 12 }}><span className="wf-ico wf-ico-lg">⚠</span><div><h1 className="wf-h1">Avvisi</h1><div className="wf-period">3 attivi · 1 critico</div></div></div>
        <div className="wf-row" style={{ gap: 8 }}><span className="wf-chip wf-chip-on">Tutti</span><span className="wf-chip">Critici</span><span className="wf-btn">Segna letti</span></div>
      </div>
      {ALERTS.map((a, i) => (
        <div key={i} className={`wf-card wf-sketch ${i % 2 ? 'wf-sketch-2' : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderLeft: `6px solid var(--wf-${a[0]})` }}>
          <span className={`wf-ico wf-ico-lg`} style={{ borderColor: `var(--wf-${a[0]})` }}>{a[0] === 'ok' ? '↻' : '!'}</span>
          <div className="wf-col wf-grow"><b style={{ fontSize: 18 }}>{a[1]}</b><span className="wf-muted" style={{ fontSize: 15 }}>{a[2]}</span></div>
          <div className="wf-col" style={{ alignItems: 'flex-end', gap: 6 }}><span className={`wf-badge ${a[0]}`}>{a[0] === 'danger' ? 'critico' : a[0] === 'warn' ? 'attenzione' : 'info'}</span><span className="wf-faint" style={{ fontSize: 13 }}>{a[3]}</span></div>
        </div>
      ))}
      <div className="wf-note" style={{ right: 30, bottom: 14 }}>stesso avviso che arriva su Telegram</div>
    </div>
  );
}

/* ===== Notifiche — B: raggruppate per gravità ===== */
function NotifB() {
  const groups = [['danger', 'Critici', ALERTS.slice(0, 1)], ['warn', 'Attenzione', ALERTS.slice(1, 3)], ['ok', 'Attività', ALERTS.slice(3)]];
  return (
    <div className="wf-frame">
      <div className="wf-top">
        <div className="wf-row" style={{ gap: 12 }}><span className="wf-ico wf-ico-lg">⚠</span><div><h1 className="wf-h1">Centro avvisi</h1><div className="wf-period">aggiornato ora</div></div></div>
        <span className="wf-btn">⚙ Preferenze notifiche</span>
      </div>
      {groups.map(([st, title, items]) => (
        <div key={st} className="wf-col" style={{ gap: 8 }}>
          <div className="wf-row" style={{ gap: 8 }}><span className={`wf-dot ${st}`} /><span className="wf-lbl-sm" style={{ color: `var(--wf-${st})` }}>{title} · {items.length}</span></div>
          {items.map((a, i) => (
            <div key={i} className="wf-card wf-sketch" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: '11px 16px' }}>
              <span className="wf-col wf-grow"><b style={{ fontSize: 17 }}>{a[1]}</b><span className="wf-muted" style={{ fontSize: 14 }}>{a[2]}</span></span>
              <span className="wf-faint" style={{ fontSize: 13 }}>{a[3]}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="wf-note" style={{ left: 40, bottom: 12 }}>raggruppato → trovi subito i critici</div>
    </div>
  );
}

/* ===== Impostazioni — A: tabella con slider ===== */
function SettingsA() {
  return (
    <div className="wf-frame">
      <div className="wf-top">
        <div className="wf-row" style={{ gap: 12 }}><span className="wf-ico wf-ico-lg">⚙</span><div><h1 className="wf-h1">Soglie & categorie</h1><div className="wf-period">8 categorie</div></div></div>
        <span className="wf-btn wf-btn-accent">+ Nuova categoria</span>
      </div>
      <div className="wf-card wf-sketch wf-grow">
        <div className="wf-tr wf-th" style={{ gridTemplateColumns: '1.4fr 2fr 1fr', borderBottomStyle: 'solid' }}><span>Categoria</span><span>Soglia mensile</span><span>Speso</span></div>
        {CATS.map((c) => (
          <div key={c.name} className="wf-tr" style={{ gridTemplateColumns: '1.4fr 2fr 1fr', gap: 14, fontSize: 16 }}>
            <span className="wf-row" style={{ gap: 9 }}><span className="wf-ico" style={{ width: 28, height: 28, fontSize: 13 }}>{c.icon}</span>{c.name}</span>
            <span className="wf-row" style={{ gap: 10 }}>
              <span className="wf-sketch" style={{ padding: '3px 12px', fontSize: 15, borderWidth: 1.8 }}>{eur(c.threshold)}</span>
              <span className="wf-track wf-grow" style={{ maxWidth: 150 }}><span className={`wf-fill ${c.status === 'ok' ? '' : c.status}`} style={{ width: Math.min(100, (c.spent / c.threshold) * 100) + '%' }} /></span>
            </span>
            <span className="wf-faint">{eur(c.spent)}</span>
          </div>
        ))}
      </div>
      <div className="wf-note" style={{ right: 30, top: 96 }}>campo soglia editabile inline</div>
    </div>
  );
}

/* ===== Impostazioni — B: card per categoria ===== */
function SettingsB() {
  return (
    <div className="wf-frame">
      <div className="wf-top">
        <div className="wf-row" style={{ gap: 12 }}><span className="wf-ico wf-ico-lg">⚙</span><div><h1 className="wf-h1">Imposta soglie</h1><div className="wf-period">trascina per regolare</div></div></div>
        <div className="wf-row" style={{ gap: 8 }}><span className="wf-chip">Telegram ✓</span><span className="wf-btn wf-btn-accent">+ Categoria</span></div>
      </div>
      <div className="wf-grid wf-grow" style={{ gridTemplateColumns: '1fr 1fr', alignContent: 'start' }}>
        {CATS.slice(0, 6).map((c) => (
          <div key={c.name} className="wf-card wf-sketch" style={{ gap: 10 }}>
            <div className="wf-row wf-between"><span className="wf-row" style={{ gap: 9 }}><span className="wf-ico" style={{ width: 30, height: 30, fontSize: 15 }}>{c.icon}</span><b style={{ fontSize: 17 }}>{c.name}</b></span><span className="wf-num" style={{ fontSize: 18 }}>{eur(c.threshold)}</span></div>
            <div className="wf-track" style={{ height: 16 }}><div className={`wf-fill ${c.status === 'ok' ? '' : c.status}`} style={{ width: Math.min(100, (c.spent / c.threshold) * 100) + '%', position: 'relative' }} /></div>
            <div className="wf-row wf-between wf-faint" style={{ fontSize: 13 }}><span>speso {eur(c.spent)}</span><span>soglia ⟷</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { CatDetailA, CatDetailB, NotifA, NotifB, SettingsA, SettingsB });
