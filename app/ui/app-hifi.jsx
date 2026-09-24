/* global React, ReactDOM, Icon, buildCategories, DEFAULT_THRESHOLDS,
   Dashboard, Detail, Notifiche, Settings, NewCategoryModal,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio */
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2bd47d",
  "theme": "dark"
}/*EDITMODE-END*/;

const ACCENTS = {
  "#2bd47d": "#16b87a", // verde menta
  "#5b8cff": "#3a63e0", // blu
  "#a877ff": "#7b4ddb", // viola
  "#ff9d4d": "#f0792e", // arancio
};

const NAV = [
  { id: 'dash', icon: 'home', label: 'Panoramica' },
  { id: 'detail', icon: 'tag', label: 'Categorie' },
  { id: 'notif', icon: 'bell', label: 'Avvisi' },
  { id: 'settings', icon: 'gear', label: 'Soglie' },
];

const TITLES = {
  dash: ['Panoramica'],
  detail: ['Dettaglio categoria'],
  notif: ['Notifiche'],
  settings: ['Soglie & categorie'],
};
const CRUMBS = {
  dash: 'Budget', detail: 'Categorie', notif: 'Centro avvisi', settings: 'Configurazione',
};

// Formatta un'attesa (ms) come "2h 15m" / "8m" / "<1m".
function fmtRemaining(ms) {
  if (ms <= 0) return '';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('dash');
  const [activeCat, setActiveCat] = useState('shop');
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [customDefs, setCustomDefs] = useState([]);
  const [period, setPeriod] = useState('month');
  const [modal, setModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [updated, setUpdated] = useState('2 min fa');
  const toastTimer = useRef(null);
  const [dataVersion, setDataVersion] = useState(0);
  // Stato sincronizzazione (quando è stimato possibile risincronizzare) + tick countdown.
  const [syncInfo, setSyncInfo] = useState({ canSyncNow: true, nextSyncAt: null });
  const [, setTick] = useState(0);
  const refreshSyncStatus = () =>
    fetch('/api/sync-status').then((r) => r.json()).then(setSyncInfo).catch(() => {});
  // Notifiche viste (persistite): il badge conta solo le NON viste.
  const [seenNotifs, setSeenNotifs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bt_seen_notifs') || '[]'); } catch (e) { return []; }
  });

  // period-aware categories for dashboard/detail/notifiche
  const cats = useMemo(() => buildCategories(thresholds, period, customDefs), [thresholds, period, customDefs, dataVersion]);
  // settings always edits the MONTHLY threshold
  const catsMonth = useMemo(() => buildCategories(thresholds, 'month', customDefs), [thresholds, customDefs, dataVersion]);
  // Tutte le notifiche correnti (avvisi + attività) e quante ne restano da leggere.
  const allNotifs = useMemo(() => (window.buildNotifs ? window.buildNotifs(cats) : []), [cats]);
  const unreadCount = allNotifs.filter((n) => !seenNotifs.includes(n.id)).length;

  // Ri-renderizza quando il bridge aggiorna i dati in-place (dopo una modifica).
  useEffect(() => {
    window.__onData && window.__onData(() => setDataVersion((v) => v + 1));
  }, []);

  // Stato sync iniziale + tick ogni 30s per aggiornare il countdown.
  useEffect(() => {
    refreshSyncStatus();
    const t = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // Persisti lo stato "viste".
  useEffect(() => {
    try { localStorage.setItem('bt_seen_notifs', JSON.stringify(seenNotifs)); } catch (e) { /* ignore */ }
  }, [seenNotifs]);

  // Aprendo gli Avvisi, segna come viste tutte le notifiche presenti → badge azzerato.
  useEffect(() => {
    if (screen !== 'notif') return;
    setSeenNotifs((prev) => {
      const ids = allNotifs.map((n) => n.id);
      const merged = Array.from(new Set([...prev, ...ids]));
      return merged.length === prev.length ? prev : merged;
    });
  }, [screen, allNotifs]);

  // apply theme + accent
  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--acc', t.accent);
    r.style.setProperty('--acc-2', ACCENTS[t.accent] || '#16b87a');
    document.body.classList.toggle('theme-light', t.theme === 'light');
  }, [t.accent, t.theme]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };
  const sync = () => {
    if (syncing || !syncInfo.canSyncNow) return;
    setSyncing(true);
    fetch('/api/sync', { method: 'POST' })
      .then((r) => r.json())
      .then(async (res) => {
        setSyncing(false);
        refreshSyncStatus();
        if (res && res.ok === false) {
          showToast(res.error || 'Sincronizzazione non riuscita');
          return;
        }
        // Aggiorna i dati in-place, senza ricaricare la pagina.
        if (window.__refreshData) await window.__refreshData();
        setUpdated('adesso');
        showToast(
          res.inserted > 0
            ? `Sincronizzato · ${res.inserted} nuove transazioni`
            : 'Sincronizzato · nessuna nuova transazione',
        );
      })
      .catch(() => { setSyncing(false); refreshSyncStatus(); showToast('Sincronizzazione fallita'); });
  };
  const openCat = (id) => { setActiveCat(id); setScreen('detail'); };
  // Aggiorna localmente (UI reattiva) e salva la soglia sul backend (debounce nel bridge).
  const setThreshold = (id, v) => {
    setThresholds((p) => ({ ...p, [id]: v }));
    window.__saveThreshold && window.__saveThreshold(id, v);
  };

  // Crea la categoria sul backend (poi il bridge ricarica i dati reali).
  const addCategory = ({ name, threshold }) => {
    setModal(false);
    window.__createCategory && window.__createCategory(name, threshold);
  };

  const crumb = CRUMBS[screen] + ' · ' + (period === 'year' ? 'Anno 2026' : 'Maggio 2026');
  const title = TITLES[screen][0];

  // Countdown alla prossima sincronizzazione possibile (stima rate limit Hype).
  const remainingMs = syncInfo.nextSyncAt ? new Date(syncInfo.nextSyncAt).getTime() - Date.now() : 0;
  const canSync = remainingMs <= 0;

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo">€</div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-btn ${screen === n.id ? 'active' : ''}`} title={n.label}
            onClick={() => setScreen(n.id)}>
            <Icon name={n.icon} />
            {n.id === 'notif' && unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
        ))}
        <div className="spacer" />
        <div className="nav-av">MR</div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            {screen === 'detail' && (
              <button className="btn ghost" onClick={() => setScreen('dash')} title="Torna alla panoramica" style={{ padding: 8 }}>
                <Icon name="arrowL" style={{ width: 20, height: 20 }} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="crumb">{crumb}</div>
              <h1>{screen === 'detail' ? (cats.find((c) => c.id === activeCat) || {}).name : title}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="seg">
              <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Mese</button>
              <button className={period === 'year' ? 'on' : ''} onClick={() => setPeriod('year')}>Anno</button>
            </div>
            <span className="faint" style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              title={canSync ? 'Sincronizzazione disponibile' : 'Limite Hype: prossima sync stimata'}>
              {canSync ? (
                <>agg. {updated}</>
              ) : (
                <><Icon name="sync" style={{ width: 13, height: 13 }} /> riattiva tra {fmtRemaining(remainingMs)}</>
              )}
            </span>
            <button className="btn primary" onClick={sync} disabled={syncing || !canSync}
              title={canSync ? 'Sincronizza ora' : `Limite Hype raggiunto · riprova tra ${fmtRemaining(remainingMs)}`}>
              <Icon name="sync" style={syncing ? { animation: 'spin 1s linear infinite' } : null} />
              {syncing ? 'Sincronizzo…' : canSync ? 'Sincronizza' : `tra ${fmtRemaining(remainingMs)}`}
            </button>
          </div>
        </header>

        <div className="content scroll">
          {screen === 'dash' && <Dashboard cats={cats} onOpen={openCat} period={period} />}
          {screen === 'detail' && <Detail cats={cats} catId={activeCat} onSelect={setActiveCat} onEdit={() => setScreen('settings')} onChange={setThreshold} period={period} />}
          {screen === 'notif' && <Notifiche cats={cats} onOpen={openCat} />}
          {screen === 'settings' && <Settings cats={catsMonth} onChange={setThreshold}
            onRename={(id, name) => window.__renameCategory && window.__renameCategory(id, name)}
            onDelete={(id) => window.__deleteCategory && window.__deleteCategory(id)}
            onReset={() => window.location.reload()} onAdd={() => setModal(true)} />}
        </div>
      </div>

      {modal && <NewCategoryModal onClose={() => setModal(false)} onCreate={addCategory} />}

      <div className={`toast ${toast ? 'show' : ''}`}>
        <span className="tdot" />{toast}
      </div>

      <TweaksPanel>
        <TweakSection label="Aspetto" />
        <TweakColor label="Accento" value={t.accent} options={Object.keys(ACCENTS)} onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Tema" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
