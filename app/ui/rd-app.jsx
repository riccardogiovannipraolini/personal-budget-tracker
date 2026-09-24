/* global React, ReactDOM, Icon, buildCategories, DEFAULT_THRESHOLDS, PICK_ICONS, eur,
   Dashboard, Categories, Notifications, buildNotifs, Detail,
   useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio */
// Shell del REDESIGN "minimal audace" — collegata al backend REALE:
//  - dati da eb-bridge (buildCategories / TXNS / HISTORY reali, refresh in-place via __onData)
//  - sync reale (/api/sync + /api/sync-status, countdown rate-limit Hype)
//  - CRUD categorie (__createCategory/__renameCategory/__deleteCategory/__saveThreshold)
//  - azioni transazione (__setExcluded/__relabel/__deleteTransaction)
const { useState, useEffect, useMemo, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#2bd47d",
  "theme": "dark",
  "density": "comfy"
}/*EDITMODE-END*/;

const ACCENTS = {
  "#2bd47d": "#16b87a", // verde menta
  "#5b8cff": "#3a63e0", // blu
  "#c8b06b": "#a8924f", // ottone
  "#e9756b": "#d65b50", // corallo
};

// Formatta un'attesa (ms) come "2h 15m" / "8m".
function fmtRemaining(ms) {
  if (ms <= 0) return '';
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// Modal nuova categoria — nome + soglia mensile + icona.
function NewCategoryModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState('150');
  const [icon, setIcon] = useState('tag');
  const valid = name.trim().length > 0;
  const submit = () => { if (valid) onCreate({ name: name.trim(), threshold: Math.max(0, Math.round(Number(threshold) || 0)), icon }); };
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>Nuova categoria</h2>
        <div className="sub">Definisci nome, soglia mensile e un'icona.</div>
        <div className="field">
          <label>Nome</label>
          <input className="input" autoFocus value={name} placeholder="es. Tempo libero"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div className="field">
          <label>Soglia mensile (€)</label>
          <input className="input" type="text" inputMode="numeric" value={threshold}
            onChange={(e) => setThreshold(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} />
        </div>
        <div className="field">
          <label>Icona</label>
          <div className="icon-grid">
            {PICK_ICONS.map((ic) => (
              <button key={ic} className={`icon-pick ${ic === icon ? 'on' : ''}`} onClick={() => setIcon(ic)}>
                <Icon name={ic} />
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <button className="btn ghost" onClick={onClose}>Annulla</button>
          <button className="btn primary" disabled={!valid} onClick={submit}>Crea categoria</button>
        </div>
      </div>
    </div>
  );
}

const CRUMB = { dash: 'Budget', cats: 'Budget', notif: 'Budget', detail: 'Categorie' };
const NAV = [
  { id: 'dash', icon: 'home', label: 'Panoramica' },
  { id: 'cats', icon: 'tag', label: 'Categorie' },
  { id: 'notif', icon: 'bell', label: 'Notifiche' },
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('dash');
  const [backTo, setBackTo] = useState('dash');
  const [activeCat, setActiveCat] = useState(null);
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [period, setPeriod] = useState('month');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [updated, setUpdated] = useState('poco fa');
  const toastTimer = useRef(null);
  const [modal, setModal] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  // Stato sincronizzazione (rate-limit Hype) + tick per il countdown.
  const [syncInfo, setSyncInfo] = useState({ canSyncNow: true, nextSyncAt: null });
  const [, setTick] = useState(0);
  const refreshSyncStatus = () =>
    fetch('/api/sync-status').then((r) => r.json()).then(setSyncInfo).catch(() => {});

  const [seenNotifs, setSeenNotifs] = useState(() => {
    try { const s = localStorage.getItem('bt_seen_notifs'); if (s) return JSON.parse(s); } catch (e) { /* ignore */ }
    // Prima esecuzione: solo gli avvisi "freschi" restano non letti.
    try { return buildNotifs(buildCategories(DEFAULT_THRESHOLDS, 'month', [])).filter((n) => !n.fresh).map((n) => n.id); }
    catch (e) { return []; }
  });
  const prevScreen = useRef('dash');

  // Categorie reali (period-aware). dataVersion forza il ricalcolo dopo un refresh in-place.
  const cats = useMemo(() => buildCategories(thresholds, period, []), [thresholds, period, dataVersion]);
  // Transazioni reali del mese corrente (pubblicate dal bridge).
  const txns = useMemo(() => window.TXNS || [], [dataVersion]);

  // Default categoria attiva per il Detail: la prima reale.
  const curCat = (activeCat && cats.find((c) => c.id === activeCat)) ? activeCat : (cats[0] && cats[0].id);

  // Ri-renderizza quando il bridge aggiorna i dati in-place.
  useEffect(() => { window.__onData && window.__onData(() => setDataVersion((v) => v + 1)); }, []);

  // Stato sync iniziale + tick ogni 30s per il countdown.
  useEffect(() => {
    refreshSyncStatus();
    const id = setInterval(() => setTick((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const r = document.documentElement;
    r.style.setProperty('--acc', t.accent);
    r.style.setProperty('--acc-2', ACCENTS[t.accent] || '#16b87a');
    r.style.setProperty('--pad', t.density === 'compact' ? '24px' : t.density === 'comfy' ? '40px' : '32px');
    document.body.classList.toggle('theme-light', t.theme === 'light');
  }, [t.accent, t.theme, t.density]);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  const sync = () => {
    if (syncing || !canSync) return;
    setSyncing(true);
    fetch('/api/sync', { method: 'POST' })
      .then((r) => r.json())
      .then(async (res) => {
        setSyncing(false);
        refreshSyncStatus();
        if (res && res.ok === false) { showToast(res.error || 'Sincronizzazione non riuscita'); return; }
        if (window.__refreshData) await window.__refreshData();
        setUpdated('adesso');
        showToast(res.inserted > 0 ? `Sincronizzato · ${res.inserted} nuove transazioni` : 'Sincronizzato · nessuna nuova transazione');
      })
      .catch(() => { setSyncing(false); refreshSyncStatus(); showToast('Sincronizzazione fallita'); });
  };

  const openCat = (id) => { setBackTo(screen === 'detail' ? backTo : screen); setActiveCat(id); setScreen('detail'); };

  // Soglia: aggiorna localmente (UI reattiva) + salva sul backend (debounce nel bridge).
  const setThreshold = (id, v) => {
    setThresholds((p) => ({ ...p, [id]: v }));
    window.__saveThreshold && window.__saveThreshold(id, v);
  };

  const addCategory = ({ name, threshold, icon }) => {
    setModal(false);
    window.__createCategory && window.__createCategory(name, threshold, icon);
  };

  // Azioni transazione → backend (poi refresh in-place).
  const toggleExcludeTxn = (id, excluded) => window.__setExcluded && window.__setExcluded(id, excluded);
  const reassignTxn = (id, catId) => window.__relabel && window.__relabel(id, catId === 'senza' ? '' : catId);
  const deleteTxn = (id) => window.__deleteTransaction && window.__deleteTransaction(id);

  // Azioni categoria → backend (rinomina/elimina/cambio icona inline da Categorie e Dettaglio).
  const renameCategory = (id, name) => window.__renameCategory && window.__renameCategory(id, name);
  const deleteCategory = (id) => window.__deleteCategory && window.__deleteCategory(id);
  const changeCategoryIcon = (id, icon) => window.__setCategoryIcon && window.__setCategoryIcon(id, icon);
  // Dal Dettaglio: dopo l'eliminazione la categoria non esiste più → torna alla lista.
  const deleteCategoryFromDetail = (id) => { deleteCategory(id); setScreen(backTo === 'detail' ? 'cats' : backTo); };

  const crumb = CRUMB[screen] + ' · ' + (period === 'year' ? 'Anno 2026' : 'Maggio 2026');
  const title = screen === 'detail'
    ? ((cats.find((c) => c.id === curCat) || {}).name || 'Dettaglio')
    : screen === 'cats' ? 'Categorie' : screen === 'notif' ? 'Notifiche' : 'Panoramica';
  const activeNav = screen === 'detail' ? backTo : screen;

  // Notifiche non lette → badge.
  const notifs = useMemo(() => buildNotifs(cats), [cats]);
  const unreadNotifs = notifs.filter((n) => !seenNotifs.includes(n.id)).length;
  const markAllRead = () => setSeenNotifs((p) => Array.from(new Set([...p, ...notifs.map((n) => n.id)])));

  useEffect(() => {
    try { localStorage.setItem('bt_seen_notifs', JSON.stringify(seenNotifs)); } catch (e) { /* ignore */ }
  }, [seenNotifs]);

  // Lasciando le Notifiche → segna tutto come letto.
  useEffect(() => {
    if (prevScreen.current === 'notif' && screen !== 'notif') markAllRead();
    prevScreen.current = screen;
  }, [screen]);

  const remainingMs = syncInfo.nextSyncAt ? new Date(syncInfo.nextSyncAt).getTime() - Date.now() : 0;
  const canSync = remainingMs <= 0;

  return (
    <div className="app">
      <nav className="nav">
        <div className="brandrow">
          <div className="logo">B</div>
        </div>
        {NAV.map((n) => (
          <button key={n.id} className={`nav-btn ${activeNav === n.id ? 'active' : ''}`}
            title={n.label} onClick={() => setScreen(n.id)}>
            <Icon name={n.icon} />
            <span>{n.label}</span>
            {n.id === 'notif' && unreadNotifs > 0 && <span className="badge">{unreadNotifs}</span>}
          </button>
        ))}
        <div className="spacer" />
        <div className="nav-foot"><div className="nav-av">MR</div></div>
      </nav>
      <div className="main">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
            {screen === 'detail' && (
              <button className="btn ghost" onClick={() => setScreen(backTo)} title="Torna indietro" style={{ padding: 8 }}>
                <Icon name="arrowL" style={{ width: 20, height: 20 }} />
              </button>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="crumb">{crumb}</div>
              <h1>{title}</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {screen === 'notif' ? (
              <button className="btn" onClick={markAllRead} disabled={unreadNotifs === 0}
                title={unreadNotifs === 0 ? 'Nessuna notifica da leggere' : 'Segna tutte come lette'}>
                <Icon name="bell" /> Segna tutte come lette
              </button>
            ) : (
              <>
                <div className="seg">
                  <button className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Mese</button>
                  <button className={period === 'year' ? 'on' : ''} onClick={() => setPeriod('year')}>Anno</button>
                </div>
                <span className="faint" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  {!canSync && <><Icon name="sync" style={{ width: 13, height: 13 }} /> riattiva tra {fmtRemaining(remainingMs)}</>}
                  {canSync && updated === 'adesso' && 'agg. adesso'}
                </span>
                <button className="btn primary" onClick={sync} disabled={syncing || !canSync}
                  title={canSync ? 'Sincronizza ora' : `Limite raggiunto · riprova tra ${fmtRemaining(remainingMs)}`}>
                  <Icon name="sync" style={syncing ? { animation: 'spin 1s linear infinite' } : null} />
                  {syncing ? 'Sincronizzo…' : canSync ? 'Sincronizza' : `tra ${fmtRemaining(remainingMs)}`}
                </button>
              </>
            )}
          </div>
        </header>

        <div className="content scroll">
          {screen === 'dash' && <Dashboard cats={cats} onOpen={openCat} period={period} />}
          {screen === 'cats' && <Categories cats={cats} onOpen={openCat} onAdd={() => setModal(true)}
            onRename={renameCategory} onDelete={deleteCategory} onIconChange={changeCategoryIcon} />}
          {screen === 'notif' && <Notifications cats={cats} onOpen={openCat} seen={seenNotifs} />}
          {screen === 'detail' && <Detail cats={cats} catId={curCat} onSelect={setActiveCat} onChange={setThreshold}
            period={period} txns={txns} onToggleExclude={toggleExcludeTxn} onReassign={reassignTxn} onDelete={deleteTxn}
            onRenameCat={renameCategory} onDeleteCat={deleteCategoryFromDetail} onIconChange={changeCategoryIcon} />}
        </div>
      </div>

      {modal && <NewCategoryModal onClose={() => setModal(false)} onCreate={addCategory} />}

      <div className={`toast ${toast ? 'show' : ''}`} style={{ position: 'fixed', bottom: 26, left: '50%', transform: toast ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)', background: 'var(--surface-3)', border: '1px solid var(--line-2)', color: 'var(--text)', padding: '12px 18px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 11, fontSize: 14, fontWeight: 600, opacity: toast ? 1 : 0, pointerEvents: 'none', transition: '.3s', zIndex: 80 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acc)' }} />{toast}
      </div>

      <TweaksPanel>
        <TweakSection label="Aspetto" />
        <TweakColor label="Accento" value={t.accent} options={Object.keys(ACCENTS)} onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="Tema" value={t.theme} options={['dark', 'light']} onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Densità" value={t.density} options={['compact', 'regular', 'comfy']} onChange={(v) => setTweak('density', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
