/* global React, Icon, eur, Count, statusLabel, LineChart, HISTORY, MONTHS6 */
// Dashboard REDESIGN — minimale: header residuo + categorie a tabella.

// Riga compatta "Da tenere d'occhio" — categoria vicina/oltre la soglia.
function WatchItem({ c, onOpen, i }) {
  const pct = Math.round(c.ratio * 100);
  return (
    <button className="watch-row rise" style={{ animationDelay: `${0.04 * i}s` }} onClick={() => onOpen(c.id)}>
      <span className="cico" style={{ width: 32, height: 32 }}><Icon name={c.icon} style={{ width: 16, height: 16 }} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <span className="nm" style={{ fontSize: 14 }}>{c.name}</span>
          <span className={`fig c-${c.status}`} style={{ fontSize: 13, flex: 'none' }}>{pct}%</span>
        </span>
        <span className={`bar ${c.status}`} style={{ display: 'block', marginTop: 8 }}><i style={{ width: Math.min(100, c.ratio * 100) + '%' }} /></span>
        <span style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
          <span className="faint" style={{ fontSize: 11.5 }}>{eur(c.spent)} / {eur(c.threshold)}</span>
          <span className="faint" style={{ fontSize: 11.5, color: c.remaining < 0 ? 'var(--danger)' : 'var(--text-3)' }}>
            {c.remaining < 0 ? `${eur(c.remaining)}` : `restano ${eur(c.remaining)}`}
          </span>
        </span>
      </span>
    </button>
  );
}

function Dashboard({ cats, onOpen, period }) {
  const isYear = period === 'year';
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const totalThreshold = cats.reduce((s, c) => s + c.threshold, 0);
  const remaining = totalThreshold - totalSpent;
  const ratio = totalSpent / totalThreshold;
  const pctUsed = Math.round(ratio * 100);
  const status = ratio >= 1 ? 'danger' : ratio >= 0.85 ? 'warn' : 'ok';
  // alert prima, poi per ratio decrescente
  const ordered = [...cats].sort((a, b) => b.ratio - a.ratio);
  const alerts = cats.filter((c) => c.status !== 'ok').length;
  const watch = ordered.slice(0, 4);
  // Andamento di spesa generale: totale mensile su tutte le categorie (ultimi 6 mesi).
  const monthly = MONTHS6.map((_, i) => Object.keys(HISTORY).reduce((s, k) => s + (HISTORY[k][i] || 0), 0));
  const avgMonthly = monthly.reduce((a, b) => a + b, 0) / monthly.length;
  const lastDelta = monthly[monthly.length - 1] - monthly[monthly.length - 2];
  // Vista annuale: spesa cumulata (year-to-date).
  const cumulative = monthly.reduce((acc, m, i) => { acc.push((acc[i - 1] || 0) + m); return acc; }, []);
  const totalYear = cumulative[cumulative.length - 1];
  const trendData = isYear ? cumulative : monthly;

  return (
    <div className="screen fill fade">
      {/* HEADER RESIDUO — tipografia protagonista, micro-stat allineate */}
      <div className="rise">
        <div className="eyebrow" style={{ marginBottom: 10 }}>Ti resta da spendere · {isYear ? '2026' : 'maggio'}</div>
        <Count value={remaining} format={eur} className="fig"
          style={{ fontSize: 64, lineHeight: 1, display: 'block', color: remaining < 0 ? 'var(--danger)' : 'var(--text)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 20, maxWidth: 480 }}>
          <span className={`bar ${status}`} style={{ flex: 1, height: 7 }}><i style={{ width: Math.min(100, ratio * 100) + '%' }} /></span>
          <span className={`fig c-${status}`} style={{ fontSize: 14, flex: 'none' }}>{pctUsed}% usato</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 15, fontSize: 13, whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
          <span className="faint">Speso <span className="fig" style={{ color: 'var(--text)' }}>{eur(totalSpent)}</span></span>
          <span className="faint">·</span>
          <span className="faint">Budget <span className="fig" style={{ color: 'var(--text)' }}>{eur(totalThreshold)}</span></span>
          <span className="faint">·</span>
          <span className="faint">{isYear ? '6 mesi' : 'reset tra 2 gg'}</span>
          {alerts > 0 && (
            <span className={`pill ${cats.some((c) => c.status === 'danger') ? 'danger' : 'warn'}`}>
              <span className={`dot ${cats.some((c) => c.status === 'danger') ? 'danger' : 'warn'}`} />
              {alerts} da tenere d’occhio
            </span>
          )}
        </div>
      </div>

      {/* RIGA A DUE BLOCCHI — sinistra: da tenere d'occhio · destra: andamento */}
      <div className="hero-grid rise" style={{ marginTop: 36, animationDelay: '.06s' }}>
        <div className="card pad block">
          <div className="sec-head" style={{ marginBottom: 6 }}>
            <h3 className="sec-title">Da tenere d’occhio</h3>
            <span className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>vicine alla soglia</span>
          </div>
          <div className="watch-list">
            {watch.map((c, i) => <WatchItem key={c.id} c={c} onOpen={onOpen} i={i} />)}
          </div>
        </div>
        <div className="card pad block">
          <div className="sec-head" style={{ marginBottom: 6 }}>
            <h3 className="sec-title">{isYear ? 'Andamento · annuale' : 'Andamento · mensile'}</h3>
            <span className="faint" style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>
              {isYear
                ? 'spesa cumulata'
                : <>{lastDelta <= 0
                    ? <span className="c-ok">↓ {eur(Math.abs(lastDelta))}</span>
                    : <span className="c-danger">↑ {eur(lastDelta)}</span>} vs mese scorso</>}
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <LineChart data={trendData} months={MONTHS6} height={150} status="neutral" zeroBaseline={isYear} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <span className="faint" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{isYear ? 'totale anno' : 'media mensile'}</span>
            <span className="fig" style={{ fontSize: 14 }}>{isYear ? eur(totalYear) : eur(avgMonthly)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
